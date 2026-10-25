
using CenterManagement.Core.Features.ParentPortalFeature.Services;
using CenterManagement.Infrustructure.InfrastructureBases.Bases;
using Microsoft.Extensions.Logging;

namespace CenterManagement.Core.Features.AttendenceFeature.Commands.Handlers;

public class StudentAttendenceCommandHandler : ResponseHandler,
                      IRequestHandler<SaveStudentAttendanceCommand, Response<string>>
{
    #region Fields
    private readonly IRepositoryManager _repositoryManager;
    private readonly IStringLocalizer<SharedResources> _localizer;
    private readonly IStudentAttendanceNotification _notificationService;
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly IUserScopeService _scopeService;
    private readonly IParentNotificationService _parentNotificationService;
    private readonly ILogger<StudentAttendenceCommandHandler> _logger;
    #endregion

    #region Constructors
    public StudentAttendenceCommandHandler(IRepositoryManager repositoryService,
                                 IStringLocalizer<SharedResources> localizer,
                                 IStudentAttendanceNotification notificationService,
                                 IHttpContextAccessor httpContextAccessor,
                                 IUserScopeService scopeService,
                                 IParentNotificationService parentNotificationService,
                                 ILogger<StudentAttendenceCommandHandler> logger) : base(localizer)
    {
        _repositoryManager = repositoryService;
        _localizer = localizer;
        _notificationService = notificationService;
        _httpContextAccessor = httpContextAccessor;
        _scopeService = scopeService;
        _parentNotificationService = parentNotificationService;
        _logger = logger;
    }
    #endregion


    //#region Handle Functions

    //public async Task<Response<string>> Handle(SaveStudentAttendanceCommand request, CancellationToken cancellationToken)
    //{
    //    using var transaction = await _repositoryManager.BeginTransactionAsync();

    //    try
    //    {
    //        var session = await _repositoryManager
    //                .SessionRepository
    //                .GetByIdAsync(request.SessionId);

    //        if (session is null)
    //            return NotFound<string>("الحصة غير موجودة.");

    //        var existingAttendances = _repositoryManager
    //            .AttendanceRepository
    //            .GetTableTracking()
    //            .Where(x =>
    //                x.SessionId == request.SessionId &&
    //                x.AttendanceDate == request.AttendanceDate)
    //            .ToDictionary(x => x.StudentId);


    //        var Attendances = new List<Attendance>();
    //        foreach (var item in request.Attendances)
    //        {
    //            if (existingAttendances.TryGetValue(item.StudentId, out var attendance))
    //            {
    //                attendance.Status = item.Status;
    //                if (!string.IsNullOrWhiteSpace(item.Notes))
    //                {
    //                    attendance.Notes = item.Notes;
    //                }
    //            }
    //            else
    //            {
    //                Attendances.Add(new Attendance
    //                {
    //                    StudentId = item.StudentId,
    //                    SessionId = request.SessionId,
    //                    AttendanceDate = request.AttendanceDate,
    //                    Status = item.Status,
    //                    Notes = item.Notes
    //                });
    //            }
    //        }
    //        if (Attendances is not null)
    //            await _repositoryManager.AttendanceRepository.AddRangeAsync(Attendances);

    //        await _repositoryManager.SaveChangesAsync();
    //        await transaction.CommitAsync();

    //        #region SignalR

    //        var statusMap = request.Attendances.ToDictionary(a => a.StudentId, a => a.Status);
    //        var studentIds = statusMap.Keys.ToList();
    //        var studentsFromDb = await _repositoryManager
    //        .StudentRepository
    //        .GetTableNoTracking()
    //        .Where(x => studentIds.Contains(x.Id))
    //        .Select(x => new
    //        {
    //            x.Id,
    //            x.GroupId,
    //            x.FullName,
    //            Phone = x.PhoneNumber
    //        })
    //        .ToListAsync();

    //        var students = studentsFromDb.Select(x => new StudentAttendenceDTO
    //        {
    //            Id = x.Id,
    //            GroupId = x.GroupId,
    //            FullName = x.FullName,
    //            Phone = x.Phone,
    //            Status = statusMap.TryGetValue(x.Id, out var st) ? st : default
    //        }).ToList();

    //        // ------------------------------------------ 

    //        await _notificationService.AttendanceSaved(request.SessionId, students);
    //        #endregion

    //        return Success("تم حفظ الحضور بنجاح.");
    //    }
    //    catch (Exception ex)
    //    {
    //        await transaction.RollbackAsync();

    //        return BadRequest<string>("فشل في حفظ الحضور");
    //    }
    //}
    //#endregion


    #region Handle Functions

    public async Task<Response<string>> Handle(SaveStudentAttendanceCommand request, CancellationToken cancellationToken)
    {
        using var transaction = await _repositoryManager.BeginTransactionAsync();

        try
        {
            var session = await _repositoryManager
                    .SessionRepository
                    .GetByIdAsync(request.SessionId);

            if (session is null)
                return NotFound<string>("الحصة غير موجودة.");

            var scope = await _scopeService.ResolveAsync(cancellationToken);

            if (!scope.Allows(session.GroupId))
                return NotFound<string>("الحصة غير موجودة.");

            var existingAttendances = _repositoryManager
                .AttendanceRepository
                .GetTableTracking()
                .Where(x =>
                    x.SessionId == request.SessionId &&
                    x.AttendanceDate == request.AttendanceDate)
                .ToDictionary(x => x.StudentId);

            var attendancesToAdd = new List<Attendance>();

            // Every student whose attendance row was created or whose status
            // actually changed, with the resulting status. Re-saving the same
            // status leaves this empty, so no duplicate parent notification is
            // ever produced.
            var changedStatuses = new Dictionary<Guid, AttendanceStatus>();

            foreach (var item in request.Attendances)
            {
                if (existingAttendances.TryGetValue(item.StudentId, out var attendance))
                {
                    var statusChanged = attendance.Status != item.Status;

                    attendance.Status = item.Status;
                    if (!string.IsNullOrWhiteSpace(item.Notes))
                    {
                        attendance.Notes = item.Notes;
                    }

                    // Only a real status change counts as a manual edit, so a row
                    // recorded by a scan keeps its source until someone overrides it.
                    if (statusChanged)
                    {
                        attendance.Source = AttendanceSource.Manual;
                        attendance.RecordedAt = DateTime.UtcNow;
                        attendance.RecordedBy = CurrentUserId();

                        changedStatuses[item.StudentId] = item.Status;
                    }
                }
                else
                {
                    attendancesToAdd.Add(new Attendance
                    {
                        StudentId = item.StudentId,
                        SessionId = request.SessionId,
                        AttendanceDate = request.AttendanceDate,
                        Status = item.Status,
                        Notes = item.Notes,
                        Source = AttendanceSource.Manual,
                        RecordedAt = DateTime.UtcNow,
                        RecordedBy = CurrentUserId()
                    });

                    changedStatuses[item.StudentId] = item.Status;
                }
            }

            if (attendancesToAdd.Count > 0)
                await _repositoryManager.AttendanceRepository.AddRangeAsync(attendancesToAdd);

            await _repositoryManager.SaveChangesAsync();
            await transaction.CommitAsync();

            #region SignalR

            var statusMap = request.Attendances.ToDictionary(a => a.StudentId, a => a.Status);
            var studentIds = statusMap.Keys.ToList();

            var studentsFromDb = await _repositoryManager
                .StudentRepository
                .GetTableNoTracking()
                .Where(x => studentIds.Contains(x.Id))
                .Select(x => new
                {
                    x.Id,
                    x.FullName,
                    Phone = x.PhoneNumber
                })
                .ToListAsync(cancellationToken);

            var students = studentsFromDb.Select(x => new StudentAttendenceDTO
            {
                Id = x.Id,
                GroupId = session.GroupId, // Used Session.GroupId instead of x.GroupId
                FullName = x.FullName,
                Phone = x.Phone,
                Status = statusMap.TryGetValue(x.Id, out var st) ? st : default
            }).ToList();

            // The live update is addressed to the center of the session, so no
            // other center ever receives these attendance rows.
            var group = await _repositoryManager
                .GroupRepository
                .GetByIdAsync(session.GroupId);

            var centerId = group?.CenterId ?? session.CenterId ?? Guid.Empty;

            await _notificationService.AttendanceSaved(centerId, request.SessionId, students);
            #endregion

            await NotifyParentsAsync(request, changedStatuses, students, cancellationToken);

            return Success("تم حفظ الحضور بنجاح.");
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            return BadRequest<string>("فشل في حفظ الحضور");
        }
    }
    #endregion

    #region Helpers
    private Guid? CurrentUserId()
    {
        var raw = _httpContextAccessor.HttpContext?
            .User?
            .FindFirstValue(ClaimTypes.NameIdentifier);

        return Guid.TryParse(raw, out var id) ? id : null;
    }

    /// <summary>
    /// Emits one in-app notification per parent of every student whose
    /// attendance was recorded or changed. A notification failure is isolated:
    /// the attendance save has already been committed, so it is only logged.
    /// </summary>
    private async Task NotifyParentsAsync(
        SaveStudentAttendanceCommand request,
        IReadOnlyDictionary<Guid, AttendanceStatus> changedStatuses,
        IReadOnlyCollection<StudentAttendenceDTO> students,
        CancellationToken cancellationToken)
    {
        if (changedStatuses.Count == 0)
            return;

        var names = students
            .GroupBy(s => s.Id)
            .ToDictionary(g => g.Key, g => g.First().FullName);

        foreach (var (studentId, status) in changedStatuses)
        {
            if (status is not (AttendanceStatus.Present
                or AttendanceStatus.Absent
                or AttendanceStatus.Late))
                continue;

            var referenceType =
                $"Attendance:{request.SessionId}:{request.AttendanceDate:yyyyMMdd}:{(int)status}";

            var studentName = names.TryGetValue(studentId, out var name) ? name : "الطالب";

            try
            {
                await _parentNotificationService.NotifyStudentParentsAsync(
                    studentId,
                    ParentNotificationTypes.Attendance,
                    ModuleKeys.Attendance,
                    request.SessionId,
                    referenceType,
                    "تحديث الحضور",
                    $"تم تسجيل {GetAttendanceStatusName(status)} للطالب {studentName} بتاريخ {request.AttendanceDate:yyyy/MM/dd}.",
                    cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Failed to send a parent attendance notification for student {StudentId}.",
                    studentId);
            }
        }
    }

    private static string GetAttendanceStatusName(AttendanceStatus status) => status switch
    {
        AttendanceStatus.Present => "الحضور",
        AttendanceStatus.Absent => "الغياب",
        AttendanceStatus.Late => "التأخير",
        AttendanceStatus.Excused => "الغياب بعذر",
        _ => "الحضور"
    };
    #endregion

}

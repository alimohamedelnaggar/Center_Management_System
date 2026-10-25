using CenterManagement.Infrustructure.InfrastructureBases.Bases;

namespace CenterManagement.Core.Features.AttendenceFeature.Commands.Handlers;

internal sealed class ScannableStudent
{
    public Guid Id { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string PhoneNumber { get; set; } = string.Empty;
    public string? QrCode { get; set; }
    public bool IsActive { get; set; }
    public bool BelongsToGroup { get; set; }
}

public class ScanStudentAttendanceCommandHandler : ResponseHandler,
    IRequestHandler<ScanStudentAttendanceCommand, Response<ScanAttendanceResultDTO>>
{
    #region Fields
    private readonly IRepositoryManager _repositoryManager;
    private readonly IStudentAttendanceNotification _notificationService;
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly IUserScopeService _scopeService;
    #endregion

    #region Constructors
    public ScanStudentAttendanceCommandHandler(
        IRepositoryManager repositoryService,
        IStringLocalizer<SharedResources> localizer,
        IStudentAttendanceNotification notificationService,
        IHttpContextAccessor httpContextAccessor,
        IUserScopeService scopeService) : base(localizer)
    {
        _repositoryManager = repositoryService;
        _notificationService = notificationService;
        _httpContextAccessor = httpContextAccessor;
        _scopeService = scopeService;
    }
    #endregion

    #region Handle Functions
    public async Task<Response<ScanAttendanceResultDTO>> Handle(
        ScanStudentAttendanceCommand request,
        CancellationToken cancellationToken)
    {
        var code = StudentQrCodeGenerator.Normalize(request.Code);

        if (string.IsNullOrWhiteSpace(code))
            return BadRequest<ScanAttendanceResultDTO>("الكود اللي اتمسح غير صالح.");

        if (request.AttendanceDate > DateOnly.FromDateTime(DateTime.Now))
            return BadRequest<ScanAttendanceResultDTO>("لا يمكن تسجيل الحضور لتاريخ مستقبلي.");

        var session = await _repositoryManager
            .SessionRepository
            .GetByIdAsync(request.SessionId);

        if (session is null)
            return NotFound<ScanAttendanceResultDTO>("الحصة غير موجودة.");

        var scope = await _scopeService.ResolveAsync(cancellationToken);

        if (!scope.Allows(session.GroupId))
            return NotFound<ScanAttendanceResultDTO>("الحصة غير موجودة.");

        var student = await _repositoryManager
            .StudentRepository
            .GetTableNoTracking()
            .Where(x => x.QrCode == code)
            .Select(x => new ScannableStudent
            {
                Id = x.Id,
                FullName = x.FullName,
                PhoneNumber = x.PhoneNumber,
                QrCode = x.QrCode,
                IsActive = x.IsActive,
                BelongsToGroup = x.StudentGroups.Any(sg =>
                    sg.GroupId == session.GroupId && sg.IsActive && sg.LeftAt == null)
            })
            .FirstOrDefaultAsync(cancellationToken);

        if (student is null)
            return NotFound<ScanAttendanceResultDTO>("مفيش طالب بالكود ده.");

        if (!student.IsActive)
            return BadRequest<ScanAttendanceResultDTO>($"{student.FullName} غير نشط , لا يمكن تسجيل حضوره.");

        if (!student.BelongsToGroup)
            return BadRequest<ScanAttendanceResultDTO>($"{student.FullName} غير مسجل في مجموعة الحصة دي.");

        var group = await _repositoryManager
            .GroupRepository
            .GetByIdAsync(session.GroupId);

        var attendance = await _repositoryManager
            .AttendanceRepository
            .GetTableTracking()
            .FirstOrDefaultAsync(x =>
                x.StudentId == student.Id &&
                x.SessionId == request.SessionId &&
                x.AttendanceDate == request.AttendanceDate,
                cancellationToken);

        // Same card scanned twice: keep the first scan untouched.
        if (attendance is not null
            && attendance.Status == AttendanceStatus.Present
            && attendance.Source == AttendanceSource.Scan)
        {
            return Success(
                BuildResult(session.GroupId, group?.Name, student, attendance, alreadyRecorded: true),
                $"{student.FullName} متسجل حضوره بالفعل.");
        }

        if (attendance is null)
        {
            attendance = new Attendance
            {
                StudentId = student.Id,
                SessionId = request.SessionId,
                AttendanceDate = request.AttendanceDate
            };

            await _repositoryManager.AttendanceRepository.AddAsync(attendance);
        }

        attendance.Status = AttendanceStatus.Present;
        attendance.Source = AttendanceSource.Scan;
        attendance.RecordedAt = DateTime.UtcNow;
        attendance.RecordedBy = CurrentUserId();

        await _repositoryManager.SaveChangesAsync();

        #region SignalR

        await _notificationService.AttendanceSaved(
            group?.CenterId ?? session.CenterId ?? Guid.Empty,
            request.SessionId,
            [
                new StudentAttendenceDTO
                {
                    Id = student.Id,
                    GroupId = session.GroupId,
                    FullName = student.FullName,
                    Phone = student.PhoneNumber,
                    Status = AttendanceStatus.Present
                }
            ]);

        #endregion

        return Success(
            BuildResult(session.GroupId, group?.Name, student, attendance, alreadyRecorded: false),
            $"تم تسجيل حضور {student.FullName}.");
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

    private static ScanAttendanceResultDTO BuildResult(
        Guid groupId,
        string? groupName,
        ScannableStudent student,
        Attendance attendance,
        bool alreadyRecorded)
    {
        return new ScanAttendanceResultDTO
        {
            StudentId = student.Id,
            FullName = student.FullName,
            Phone = student.PhoneNumber,
            QrCode = student.QrCode,
            GroupId = groupId,
            GroupName = groupName ?? string.Empty,
            SessionId = attendance.SessionId,
            Status = attendance.Status,
            Source = attendance.Source,
            RecordedAt = attendance.RecordedAt,
            AlreadyRecorded = alreadyRecorded
        };
    }
    #endregion
}
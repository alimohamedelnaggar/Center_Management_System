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
    /// <summary>
    /// Unchanged from the previous client-side rule: a scan inside this window
    /// after the session start is Present, beyond it is Late.
    /// </summary>
    private const int ScanLateGraceMinutes = 10;

    #region Fields
    private readonly IRepositoryManager _repositoryManager;
    private readonly IStudentAttendanceNotification _notificationService;
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly IUserScopeService _scopeService;
    private readonly TimeProvider _timeProvider;
    #endregion

    #region Constructors
    public ScanStudentAttendanceCommandHandler(
        IRepositoryManager repositoryService,
        IStringLocalizer<SharedResources> localizer,
        IStudentAttendanceNotification notificationService,
        IHttpContextAccessor httpContextAccessor,
        IUserScopeService scopeService,
        TimeProvider timeProvider) : base(localizer)
    {
        _repositoryManager = repositoryService;
        _notificationService = notificationService;
        _httpContextAccessor = httpContextAccessor;
        _scopeService = scopeService;
        _timeProvider = timeProvider;
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

        var now = _timeProvider.GetLocalNow().DateTime;

        if (request.AttendanceDate > DateOnly.FromDateTime(now))
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

        // Same card scanned twice: keep the first scan untouched. A row that a
        // staff member overrode manually (Absent/Excused, Source=Manual) can
        // still be corrected by scanning the card again.
        if (attendance is not null
            && attendance.Source == AttendanceSource.Scan
            && attendance.Status is AttendanceStatus.Present or AttendanceStatus.Late)
        {
            return Success(
                BuildResult(session.GroupId, group?.Name, student, attendance, alreadyRecorded: true),
                $"{student.FullName} متسجل بالفعل.");
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

        var status = ResolveScanStatus(session.StartTime, request.AttendanceDate);

        attendance.Status = status;
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
                    Status = status
                }
            ]);

        #endregion

        var message = status == AttendanceStatus.Late
            ? $"تم تسجيل تأخر {student.FullName}."
            : $"تم تسجيل حضور {student.FullName}.";

        return Success(
            BuildResult(session.GroupId, group?.Name, student, attendance, alreadyRecorded: false),
            message);
    }
    #endregion

    #region Helpers
    /// <summary>
    /// Present inside the grace window after the session starts, Late beyond
    /// it. Back-dated scans are always Present: lateness is only meaningful
    /// against the live clock, exactly like the previous client-side rule.
    /// </summary>
    private AttendanceStatus ResolveScanStatus(
        TimeOnly sessionStart,
        DateOnly attendanceDate)
    {
        var now = _timeProvider.GetLocalNow().DateTime;

        if (attendanceDate != DateOnly.FromDateTime(now))
            return AttendanceStatus.Present;

        var elapsed = TimeOnly.FromDateTime(now).ToTimeSpan() - sessionStart.ToTimeSpan();

        return elapsed.TotalMinutes > ScanLateGraceMinutes
            ? AttendanceStatus.Late
            : AttendanceStatus.Present;
    }

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
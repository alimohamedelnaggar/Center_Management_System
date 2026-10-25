using CenterManagement.Core.Bases;
using CenterManagement.Core.Features.UsersFeature.Students.Queries.Models;
using CenterManagement.Data.AppMetaData;
using CenterManagement.Data.Entities.Abstractions;
using CenterManagement.Data.Enums;
using CenterManagement.Infrustructure.InfrastructureBases.Bases;

namespace CenterManagement.Core.Features.UsersFeature.Students.Queries.Handlers;

internal sealed class CardStudent
{
    public Guid Id { get; set; }
    public Guid? CenterId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string PhoneNumber { get; set; } = string.Empty;
    public string ParentPhoneNumber { get; set; } = string.Empty;
    public string? School { get; set; }
    public string QrCode { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
    public SubscriptionType SubscriptionType { get; set; }
    public string GroupName { get; set; } = string.Empty;
}

internal sealed class CardAttendanceRow
{
    public Guid SessionId { get; set; }
    public string GroupName { get; set; } = string.Empty;
    public int DayOfWeek { get; set; }
    public TimeOnly StartTime { get; set; }
    public TimeOnly EndTime { get; set; }
    public DateOnly AttendanceDate { get; set; }
    public int Status { get; set; }
    public string? Notes { get; set; }
}

internal sealed class CardExamRow
{
    public Guid ExamId { get; set; }
    public string ExamName { get; set; } = string.Empty;
    public string GroupName { get; set; } = string.Empty;
    public DateTime ExamDate { get; set; }
    public ExamType Type { get; set; }
    public decimal TotalMark { get; set; }
    public decimal Mark { get; set; }
}

public class GetStudentCardQueryHandler : ResponseHandler,
    IRequestHandler<GetStudentCardQuery, Response<StudentCardDTO>>
{
    private const decimal AbsentMark = -1;
    private const decimal LowGradeMissingMark = 3;

    private static readonly Dictionary<DayOfWeek, string> DayNames = new()
    {
        [DayOfWeek.Sunday] = "الأحد",
        [DayOfWeek.Monday] = "الإثنين",
        [DayOfWeek.Tuesday] = "الثلاثاء",
        [DayOfWeek.Wednesday] = "الأربعاء",
        [DayOfWeek.Thursday] = "الخميس",
        [DayOfWeek.Friday] = "الجمعة",
        [DayOfWeek.Saturday] = "السبت",
    };

    private static readonly Dictionary<SubscriptionType, string> SubscriptionLabels = new()
    {
        [SubscriptionType.Month] = "اشتراك شهري",
        [SubscriptionType.Session] = "اشتراك حصص",
    };

    private readonly IRepositoryManager _repositoryManager;
    private readonly ICenterModuleService _centerModules;

    public GetStudentCardQueryHandler(
        IRepositoryManager repositoryManager,
        ICenterModuleService centerModules,
        IStringLocalizer<SharedResources> stringLocalizer) : base(stringLocalizer)
    {
        _repositoryManager = repositoryManager;
        _centerModules = centerModules;
    }

    public async Task<Response<StudentCardDTO>> Handle(
        GetStudentCardQuery request,
        CancellationToken cancellationToken)
    {
        var code = StudentQrCodeGenerator.Normalize(request.Code);

        if (string.IsNullOrWhiteSpace(code))
            return BadRequest<StudentCardDTO>("كود الطالب غير صالح.");

        var student = await _repositoryManager
            .StudentRepository
            .GetTableNoTracking()
            .Where(x => x.QrCode == code)
            .Select(x => new CardStudent
            {
                Id = x.Id,
                CenterId = x.CenterId,
                FullName = x.FullName,
                PhoneNumber = x.PhoneNumber,
                ParentPhoneNumber = x.ParentPhoneNumber,
                School = x.School,
                QrCode = x.QrCode!,
                IsActive = x.IsActive,
                CreatedAt = x.CreatedAt,
                SubscriptionType = x.SubscriptionType,
                GroupName = x.StudentGroups
                    .Where(sg => sg.IsActive && sg.LeftAt == null)
                    .Select(sg => sg.Group.Name)
                    .FirstOrDefault() ?? string.Empty
            })
            .FirstOrDefaultAsync(cancellationToken);

        if (student is null)
            return NotFound<StudentCardDTO>("مفيش طالب بالكود ده.");

        // The card is served anonymously, so module gating must happen here.
        // Only expose a section when its module is enabled for the student's center.
        var (attendanceEnabled, gradesEnabled) = await ResolveModulesAsync(student.CenterId, cancellationToken);

        var attendances = attendanceEnabled
            ? await LoadAttendances(student.Id, cancellationToken)
            : new List<CardAttendanceRow>();

        var exams = gradesEnabled
            ? await LoadExams(student.Id, cancellationToken)
            : new List<StudentCardExamDTO>();

        return Success(
            new StudentCardDTO
            {
                QrCode = student.QrCode,
                FullName = student.FullName,
                GroupName = string.IsNullOrWhiteSpace(student.GroupName) ? null : student.GroupName,
                School = student.School,
                SubscriptionType = SubscriptionLabels.TryGetValue(student.SubscriptionType, out var label)
                    ? label
                    : student.SubscriptionType.ToString(),
                IsActive = student.IsActive,
                Phone = MaskPhone(student.PhoneNumber),
                ParentPhone = MaskPhone(student.ParentPhoneNumber),
                CreatedAt = student.CreatedAt,
                Summary = attendanceEnabled ? BuildSummary(attendances) : null,
                Attendances = attendanceEnabled
                    ? attendances
                        .OrderByDescending(a => a.AttendanceDate)
                        .Select(BuildAttendance)
                        .ToList()
                    : new List<StudentCardAttendanceDTO>(),
                Exams = exams
            },
            $"كارت الطالب {student.FullName}.");
    }

    private async Task<(bool Attendance, bool Grades)> ResolveModulesAsync(
        Guid? centerId,
        CancellationToken cancellationToken)
    {
        if (centerId is null)
            return (true, true);

        var attendance = await _centerModules.IsEnabledAsync(centerId.Value, ModuleKeys.Attendance, cancellationToken);
        var grades = await _centerModules.IsEnabledAsync(centerId.Value, ModuleKeys.Grades, cancellationToken);

        return (attendance, grades);
    }

    #region Queries
    private async Task<List<CardAttendanceRow>> LoadAttendances(
        Guid studentId,
        CancellationToken cancellationToken)
    {
        return await _repositoryManager
            .AttendanceRepository
            .GetTableNoTracking()
            .Where(x =>
                x.StudentId == studentId &&
                !x.Session.IsDeleted)
            .OrderByDescending(x => x.AttendanceDate)
            .Select(x => new CardAttendanceRow
            {
                SessionId = x.SessionId,
                GroupName = x.Session.Group != null ? x.Session.Group.Name : string.Empty,
                DayOfWeek = (int)x.Session.DayOfWeek,
                StartTime = x.Session.StartTime,
                EndTime = x.Session.EndTime,
                AttendanceDate = x.AttendanceDate,
                Status = (int)x.Status,
                Notes = x.Notes
            })
            .ToListAsync(cancellationToken);
    }

    private async Task<List<StudentCardExamDTO>> LoadExams(
        Guid studentId,
        CancellationToken cancellationToken)
    {
        var rows = await _repositoryManager
            .StudentExamComponentRepository
            .GetTableNoTracking()
            .Where(x => x.StudentId == studentId)
            .Select(x => new CardExamRow
            {
                ExamId = x.ExamComponent.ExamId,
                ExamName = x.ExamComponent.Exam.Name,
                GroupName = x.ExamComponent.Exam.Group != null
                    ? x.ExamComponent.Exam.Group.Name
                    : string.Empty,
                ExamDate = x.ExamComponent.Exam.ExamDate,
                Type = x.ExamComponent.Type,
                TotalMark = x.ExamComponent.TotalMarks,
                Mark = x.Mark
            })
            .ToListAsync(cancellationToken);

        return rows
            .GroupBy(x => x.ExamId)
            .Select(group =>
            {
                var components = group
                    .OrderBy(x => x.Type)
                    .Select(x =>
                    {
                        var isAbsent = x.Mark == AbsentMark;

                        return new StudentCardExamComponentDTO
                        {
                            TypeLabel = ExamTypeLabel(x.Type),
                            TotalMark = x.TotalMark,
                            Mark = x.Mark,
                            Percentage = isAbsent || x.TotalMark <= 0
                                ? 0
                                : Math.Round(x.Mark / x.TotalMark * 100, 1),
                            IsAbsent = isAbsent
                        };
                    })
                    .ToList();

                var scored = group.Where(x => x.Mark != AbsentMark).ToList();
                var totalMark = scored.Sum(x => x.TotalMark);
                var totalScore = scored.Sum(x => x.Mark);
                var isAbsent = group.Any(x => x.Mark == AbsentMark);
                var isLowGrade = scored.Any(x => x.TotalMark - x.Mark >= LowGradeMissingMark);

                return new StudentCardExamDTO
                {
                    ExamId = group.Key,
                    ExamName = group.First().ExamName,
                    GroupName = group.First().GroupName,
                    ExamDate = group.First().ExamDate,
                    TotalScore = totalScore,
                    TotalMark = totalMark,
                    Percentage = totalMark <= 0 ? 0 : Math.Round(totalScore / totalMark * 100, 1),
                    IsAbsent = isAbsent,
                    IsLowGrade = isLowGrade,
                    Components = components
                };
            })
            .OrderByDescending(x => x.ExamDate)
            .ToList();
    }
    #endregion

    #region Helpers
    private static StudentCardAttendanceSummaryDTO BuildSummary(
        List<CardAttendanceRow> attendances)
    {
        var present = attendances.Count(a => a.Status == (int)AttendanceStatus.Present);
        var absent = attendances.Count(a => a.Status == (int)AttendanceStatus.Absent);
        var late = attendances.Count(a => a.Status == (int)AttendanceStatus.Late);
        var excused = attendances.Count(a => a.Status == (int)AttendanceStatus.Excused);
        var graded = present + absent;

        return new StudentCardAttendanceSummaryDTO
        {
            TotalSessions = attendances.Count,
            PresentSessions = present,
            AbsentSessions = absent,
            LateSessions = late,
            ExcusedSessions = excused,
            AttendanceRate = graded == 0
                ? 0
                : Math.Round(present / (decimal)graded * 100, 1)
        };
    }

    private static StudentCardAttendanceDTO BuildAttendance(CardAttendanceRow row)
    {
        var status = (AttendanceStatus)row.Status;

        return new StudentCardAttendanceDTO
        {
            SessionId = row.SessionId,
            GroupName = row.GroupName,
            DayName = DayNames.TryGetValue((DayOfWeek)row.DayOfWeek, out var day) ? day : string.Empty,
            StartTime = row.StartTime.ToString("hh\\:mm"),
            EndTime = row.EndTime.ToString("hh\\:mm"),
            AttendanceDate = row.AttendanceDate,
            Status = status.ToString(),
            StatusLabel = AttendanceStatusLabel(status),
            Notes = row.Notes
        };
    }

    private static string AttendanceStatusLabel(AttendanceStatus status) => status switch
    {
        AttendanceStatus.Present => "حاضر",
        AttendanceStatus.Absent => "غائب",
        AttendanceStatus.Late => "متأخر",
        AttendanceStatus.Excused => "غياب بعذر",
        _ => status.ToString(),
    };

    private static string ExamTypeLabel(ExamType type) => type switch
    {
        ExamType.Paragraph => "مذاكرة",
        ExamType.Dictation => "إملاء",
        ExamType.WrittenExam => "امتحان",
        _ => "أخرى",
    };

    private static string? MaskPhone(string? phone)
    {
        if (string.IsNullOrWhiteSpace(phone))
            return null;

        var trimmed = phone.Trim();

        if (trimmed.Length <= 3)
            return new string('*', trimmed.Length);

        return $"{new string('*', trimmed.Length - 2)}{trimmed[^2..]}";
    }
    #endregion
}

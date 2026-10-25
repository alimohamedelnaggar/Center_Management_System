namespace CenterManagement.Core.Features.UsersFeature.Students.Queries.Models;

public record GetStudentCardQuery : IRequest<Response<StudentCardDTO>>
{
    public string Code { get; init; } = string.Empty;
}

public class StudentCardDTO
{
    public string QrCode { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string? GroupName { get; set; }
    public string? School { get; set; }
    public string SubscriptionType { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public string? Phone { get; set; }
    public string? ParentPhone { get; set; }
    public DateTime? CreatedAt { get; set; }

    public StudentCardAttendanceSummaryDTO? Summary { get; set; } = new();

    public List<StudentCardAttendanceDTO> Attendances { get; set; } = [];

    public List<StudentCardExamDTO> Exams { get; set; } = [];
}

public class StudentCardAttendanceSummaryDTO
{
    public int TotalSessions { get; set; }
    public int PresentSessions { get; set; }
    public int AbsentSessions { get; set; }
    public int LateSessions { get; set; }
    public int ExcusedSessions { get; set; }
    public decimal AttendanceRate { get; set; }
}

public class StudentCardAttendanceDTO
{
    public Guid SessionId { get; set; }
    public string GroupName { get; set; } = string.Empty;
    public string DayName { get; set; } = string.Empty;
    public string StartTime { get; set; } = string.Empty;
    public string EndTime { get; set; } = string.Empty;
    public DateOnly AttendanceDate { get; set; }
    public string Status { get; set; } = string.Empty;
    public string StatusLabel { get; set; } = string.Empty;
    public string? Notes { get; set; }
}

public class StudentCardExamDTO
{
    public Guid ExamId { get; set; }
    public string ExamName { get; set; } = string.Empty;
    public string GroupName { get; set; } = string.Empty;
    public DateTime ExamDate { get; set; }
    public decimal TotalScore { get; set; }
    public decimal TotalMark { get; set; }
    public decimal Percentage { get; set; }
    public bool IsAbsent { get; set; }
    public bool IsLowGrade { get; set; }
    public List<StudentCardExamComponentDTO> Components { get; set; } = [];
}

public class StudentCardExamComponentDTO
{
    public string TypeLabel { get; set; } = string.Empty;
    public decimal TotalMark { get; set; }
    public decimal Mark { get; set; }
    public decimal Percentage { get; set; }
    public bool IsAbsent { get; set; }
}

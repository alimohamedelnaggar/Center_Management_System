namespace CenterManagement.Core.Features.StudentPortalFeature.Dtos;

public class StudentProfileDTO
{
    public Guid StudentId { get; set; }
    public string FullName { get; set; } = default!;
    public string? Phone { get; set; }
    public string? ParentPhoneNumber { get; set; }
    public string? School { get; set; }
    public bool IsActive { get; set; }
    public bool IsPaid { get; set; }
    public int SubscriptionType { get; set; }
    public string SubscriptionTypeName { get; set; } = default!;
    public List<string> Groups { get; set; } = new();
    public List<StudentSubscriptionDTO> Subscriptions { get; set; } = new();
}

public class StudentSubscriptionDTO
{
    public Guid GroupId { get; set; }
    public string GroupName { get; set; } = default!;
    public DateTime JoinDate { get; set; }
    public DateTime? LeftAt { get; set; }
    public bool IsActive { get; set; }
    public decimal MonthlyPrice { get; set; }
    public int SessionsPerMonth { get; set; }
}

public class StudentAttendanceRecordDTO
{
    public DateOnly AttendanceDate { get; set; }
    public int Status { get; set; }
    public string StatusName { get; set; } = default!;
    public string GroupName { get; set; } = default!;
    public string DayOfWeek { get; set; } = default!;
    public string StartTime { get; set; } = default!;
    public string EndTime { get; set; } = default!;
    public string? Notes { get; set; }
}

public class StudentAttendanceSummaryDTO
{
    public int TotalSessions { get; set; }
    public int PresentCount { get; set; }
    public int AbsentCount { get; set; }
    public int LateCount { get; set; }
    public int ExcusedCount { get; set; }
    public decimal AttendancePercentage { get; set; }
    public List<StudentAttendanceRecordDTO> Records { get; set; } = new();
}

public class StudentPaymentDTO
{
    public Guid PaymentId { get; set; }
    public Guid GroupId { get; set; }
    public string GroupName { get; set; } = default!;
    public DateTime PaymentDate { get; set; }
    public DateOnly? BillingPeriod { get; set; }
    public int SubscriptionType { get; set; }
    public decimal Amount { get; set; }
    public decimal TotalAmount { get; set; }
    public decimal PaidAmount { get; set; }
    public decimal RemainingAmount { get; set; }
    public int Status { get; set; }
    public string StatusName { get; set; } = default!;
    public string? Notes { get; set; }
}

public class StudentPaymentsDTO
{
    public decimal TotalPaid { get; set; }
    public decimal TotalDue { get; set; }
    public int PaymentsCount { get; set; }
    public List<StudentPaymentDTO> Payments { get; set; } = new();
}

public class StudentExamListItemDTO
{
    public Guid ExamId { get; set; }
    public string Name { get; set; } = default!;
    public string GroupName { get; set; } = default!;
    public DateTime ExamDate { get; set; }
    public DateTime EndAt { get; set; }
    public int DurationMinutes { get; set; }
    public int QuestionsCount { get; set; }
    public decimal TotalMarks { get; set; }

    // upcoming | available | inprogress | finished | expired
    public string Status { get; set; } = default!;

    public Guid? AttemptId { get; set; }
    public decimal? Score { get; set; }
    public decimal? ScoredTotalMark { get; set; }
    public bool HasPendingManualGrading { get; set; }
}

public class StudentAttemptOptionDTO
{
    public Guid Id { get; set; }
    public int Order { get; set; }
    public string Text { get; set; } = default!;
}

public class StudentAttemptQuestionDTO
{
    public Guid Id { get; set; }
    public int Type { get; set; }
    public string TypeName { get; set; } = default!;
    public string? Text { get; set; }
    public string? ImageName { get; set; }
    public decimal Mark { get; set; }
    public int Order { get; set; }
    public List<StudentAttemptOptionDTO> Options { get; set; } = new();
}

public class StudentAttemptDTO
{
    public Guid AttemptId { get; set; }
    public Guid ExamId { get; set; }
    public string ExamName { get; set; } = default!;
    public int DurationMinutes { get; set; }
    public DateTime StartedAt { get; set; }
    public DateTime ServerNow { get; set; }
    public int RemainingSeconds { get; set; }
    public decimal TotalMark { get; set; }
    public bool IsSubmitted { get; set; }
    public int ViolationCount { get; set; }
    public List<StudentAttemptQuestionDTO> Questions { get; set; } = new();
}

public class StudentViolationDTO
{
    public string Type { get; set; } = default!;
}

public class StudentSubmitAnswerDTO
{
    public Guid QuestionId { get; set; }
    public Guid? SelectedOptionId { get; set; }
    public string? EssayAnswer { get; set; }
}

public class StudentResultDTO
{
    public Guid ExamId { get; set; }
    public string ExamName { get; set; } = default!;
    public decimal? Score { get; set; }
    public decimal TotalMark { get; set; }
    public DateTime? SubmittedAt { get; set; }
    public bool HasPendingManualGrading { get; set; }
    public bool IsPublished { get; set; }
    public string Status { get; set; } = default!;
}

public class StudentExamPreviewDTO
{
    public Guid ExamId { get; set; }
    public string ExamName { get; set; } = default!;
    public decimal Score { get; set; }
    public decimal TotalMark { get; set; }
    public DateTime? SubmittedAt { get; set; }
    public bool HasPendingManualGrading { get; set; }
    public List<StudentExamPreviewQuestionDTO> Questions { get; set; } = new();
}

public class StudentExamPreviewQuestionDTO
{
    public Guid Id { get; set; }
    public int Order { get; set; }
    public int Type { get; set; }
    public string TypeName { get; set; } = default!;
    public string? Text { get; set; }
    public string? ImageName { get; set; }
    public decimal Mark { get; set; }
    public decimal AwardedMark { get; set; }
    public bool? IsCorrect { get; set; }
    public Guid? SelectedOptionId { get; set; }
    public string? EssayAnswer { get; set; }
    public Guid? CorrectOptionId { get; set; }
    public List<StudentExamPreviewOptionDTO> Options { get; set; } = new();
}

public class StudentExamPreviewOptionDTO
{
    public Guid Id { get; set; }
    public int Order { get; set; }
    public string Text { get; set; } = default!;
    public bool IsCorrect { get; set; }
}

public class StudentNoteDTO
{
    public Guid Id { get; set; }
    public string Title { get; set; } = default!;
    public string? Description { get; set; }
    public string FileName { get; set; } = default!;
    public string OriginalFileName { get; set; } = default!;
    public long FileSize { get; set; }
    public DateTime CreatedAt { get; set; }
    public List<string> GroupNames { get; set; } = new();
}

using CenterManagement.Data.Entities.Users;

namespace CenterManagement.Data.Entities.QuestionBank;

public class StudentExamAttempt : BaseEntity, ITenantEntity
{
    public Guid QuestionExamId { get; set; }
    public QuestionExam QuestionExam { get; set; } = default!;

    public Guid StudentId { get; set; }
    public Student Student { get; set; } = default!;

    public DateTime StartedAt { get; set; } = DateTime.UtcNow;
    public DateTime? SubmittedAt { get; set; }

    public StudentExamAttemptStatus Status { get; set; } = StudentExamAttemptStatus.InProgress;

    public decimal Score { get; set; }
    public decimal TotalMark { get; set; }

    // True when the exam contains essay questions that need manual grading.
    public bool HasPendingManualGrading { get; set; }

    // Anti-cheat: number of detected violations during the attempt.
    public int ViolationCount { get; set; }

    // Anti-cheat: JSON dictionary of violation type -> count (e.g. {"tab-switch":2,"copy":1}).
    public string? ViolationLog { get; set; }

    // Anti-cheat: JSON array of timestamped violation events (audit trail).
    public string? ViolationTimeline { get; set; }

    public ICollection<StudentExamAnswer> Answers { get; set; } = new List<StudentExamAnswer>();

    public Guid? CenterId { get; set; }
}

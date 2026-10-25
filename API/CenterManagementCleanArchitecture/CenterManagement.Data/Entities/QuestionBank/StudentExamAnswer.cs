namespace CenterManagement.Data.Entities.QuestionBank;

public class StudentExamAnswer : BaseEntity, ITenantEntity
{
    public Guid AttemptId { get; set; }
    public StudentExamAttempt Attempt { get; set; } = default!;

    public Guid QuestionExamQuestionId { get; set; }

    // Chosen option for TrueFalse / MultipleChoice questions.
    public Guid? SelectedOptionId { get; set; }

    // Free text answer for Essay questions.
    public string? EssayAnswer { get; set; }

    public bool? IsCorrect { get; set; }
    public decimal AwardedMark { get; set; }

    public Guid? CenterId { get; set; }
}

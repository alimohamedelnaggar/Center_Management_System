namespace CenterManagement.Data.Entities.QuestionBank;

public class QuestionExamQuestionOption : BaseEntity, ITenantEntity
{
    public Guid QuestionExamQuestionId { get; set; }
    public QuestionExamQuestion QuestionExamQuestion { get; set; } = default!;

    public int Order { get; set; }

    public string Text { get; set; } = default!;

    public bool IsCorrect { get; set; }

    public Guid? CenterId { get; set; }
}

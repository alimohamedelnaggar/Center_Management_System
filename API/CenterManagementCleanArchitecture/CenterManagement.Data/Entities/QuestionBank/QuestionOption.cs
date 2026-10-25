namespace CenterManagement.Data.Entities.QuestionBank;

public class QuestionOption : BaseEntity, ITenantEntity
{
    public Guid QuestionId { get; set; }
    public Question Question { get; set; } = default!;

    public int Order { get; set; }

    public string Text { get; set; } = default!;

    public bool IsCorrect { get; set; }

    public Guid? CenterId { get; set; }
}
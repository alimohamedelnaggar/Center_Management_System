namespace CenterManagement.Data.Entities.QuestionBank;

public class Question : BaseEntity, ITenantEntity
{
    public Guid QuestionBankId { get; set; }
    public QuestionBank QuestionBank { get; set; } = default!;

    public QuestionType Type { get; set; }

    public string? Text { get; set; }

    public string? ImageName { get; set; }

    public decimal Mark { get; set; } = 1;

    public ICollection<QuestionOption> Options { get; set; } = new List<QuestionOption>();

    public Guid? CenterId { get; set; }
}
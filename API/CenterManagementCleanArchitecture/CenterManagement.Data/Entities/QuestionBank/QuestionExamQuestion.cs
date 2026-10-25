namespace CenterManagement.Data.Entities.QuestionBank;

public class QuestionExamQuestion : BaseEntity, ITenantEntity
{
    public Guid QuestionExamId { get; set; }
    public QuestionExam QuestionExam { get; set; } = default!;

    public Guid? SourceQuestionId { get; set; }

    public QuestionType Type { get; set; }

    public string? Text { get; set; }

    public string? ImageName { get; set; }

    public decimal Mark { get; set; } = 1;

    public int Order { get; set; }

    public ICollection<QuestionExamQuestionOption> Options { get; set; } = new List<QuestionExamQuestionOption>();

    public Guid? CenterId { get; set; }
}

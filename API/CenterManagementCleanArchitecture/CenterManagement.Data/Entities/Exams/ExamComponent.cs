namespace CenterManagement.Data.Entities.Exams;

public class ExamComponent : BaseEntity, ITenantEntity
{
    public Guid ExamId { get; set; }
    public Exam Exam { get; set; } = default!;

    public ExamType Type { get; set; }
    public decimal TotalMarks { get; set; }

    public ICollection<StudentExamComponent> StudentMarks { get; set; } = [];

    public Guid? CenterId { get; set; }
}

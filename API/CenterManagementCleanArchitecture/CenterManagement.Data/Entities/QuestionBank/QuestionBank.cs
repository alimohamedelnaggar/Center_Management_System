namespace CenterManagement.Data.Entities.QuestionBank;

public class QuestionBank : BaseEntity, ITenantEntity
{
    public string Name { get; set; } = default!;

    public Guid AcademicYearId { get; set; }
    public AcademicYear AcademicYear { get; set; } = default!;

    public ICollection<Question> Questions { get; set; } = new List<Question>();

    public Guid? CenterId { get; set; }
}
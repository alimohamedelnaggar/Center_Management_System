using CenterManagement.Data.Entities.Users;

namespace CenterManagement.Data.Entities.Exams;

public class StudentExamComponent : ITenantEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid? StudentId { get; set; }
    public Student? Student { get; set; }

    public Guid ExamComponentId { get; set; }
    public ExamComponent ExamComponent { get; set; } = default!;

    public decimal Mark { get; set; }

    public Guid? CenterId { get; set; }
}
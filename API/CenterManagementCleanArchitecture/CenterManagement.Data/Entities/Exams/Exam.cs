using CenterManagement.Data.Entities.Groups;

namespace CenterManagement.Data.Entities.Exams;

public class Exam : BaseEntity, ITenantEntity
{
    public string Name { get; set; } = default!;

    public Guid GroupId { get; set; }
    public Group Group { get; set; } = default!;
    public Guid SessionId { get; set; }
    public Session Session { get; set; } = default!;

    public DateTime ExamDate { get; set; } = DateTime.Now;

    public ICollection<ExamComponent> ExamComponents { get; set; } = [];
    public ICollection<StudentExamParentContact> ParentContacts { get; set; } = [];

    public Guid? CenterId { get; set; }
}

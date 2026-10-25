
namespace CenterManagement.Data.Entities.Groups;

public class Group : BaseEntity, ITenantEntity
{
    public string Name { get; set; } = default!;

    public decimal MonthlyPrice { get; set; }
    public bool IsDeleted { get; set; } = false;
    public int SessionsPerMonth { get; set; } = 8;
    public DateTime? DeletedAt { get; set; }
    public ICollection<Payment> Payments { get; set; } = [];
    public ICollection<StudentGroup> StudentGroups { get; set; } = [];
    public ICollection<TeacherGroup> TeacherGroups { get; set; } = [];
    public ICollection<Exam> Exams { get; set; } = [];
    public Guid? CenterId { get; set; }
    public virtual Center? Center { get; set; }
    public ICollection<Session> Sessions { get; set; } = [];
}


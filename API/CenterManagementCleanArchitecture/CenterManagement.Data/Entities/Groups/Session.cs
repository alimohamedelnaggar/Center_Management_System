namespace CenterManagement.Data.Entities.Groups;

public class Session : BaseEntity, ITenantEntity
{
    public Guid GroupId { get; set; }
    public Group Group { get; set; } = default!;

    public decimal SessionPrice { get; set; }
    public DayOfWeek DayOfWeek { get; set; }
    public TimeOnly StartTime { get; set; }
    public TimeOnly EndTime { get; set; }
    public bool IsDeleted { get; set; } = false;
    public ICollection<Exam> Exams { get; set; } = [];
    public ICollection<Payment> Payments { get; set; } = [];
    public Guid? CenterId { get; set; }
    public virtual Center? Center { get; set; }
    public ICollection<Attendance> Attendances { get; set; } = [];
}

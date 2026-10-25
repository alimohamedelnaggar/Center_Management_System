using CenterManagement.Data.Entities.Users;

namespace CenterManagement.Data.Entities.Groups;

public class StudentGroup : ITenantEntity
{
    public Guid StudentId { get; set; }
    public Student Student { get; set; } = default!;

    public Guid GroupId { get; set; }
    public Group Group { get; set; } = default!;

    public DateTime JoinDate { get; set; } = DateTime.UtcNow;
    public DateTime? LeftAt { get; set; } // if null then the student is still in the group
    public bool IsActive { get; set; } = true;

    public Guid? CenterId { get; set; }
}
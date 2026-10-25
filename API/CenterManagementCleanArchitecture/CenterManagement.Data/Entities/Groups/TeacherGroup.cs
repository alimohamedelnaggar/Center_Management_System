using CenterManagement.Data.Entities.Identity;

namespace CenterManagement.Data.Entities.Groups;

public class TeacherGroup : ITenantEntity
{
    public Guid TeacherId { get; set; }
    public User Teacher { get; set; } = default!;

    public Guid GroupId { get; set; }
    public Group Group { get; set; } = default!;

    public Guid? CenterId { get; set; }
}

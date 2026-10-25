using CenterManagement.Data.Entities.Identity;

namespace CenterManagement.Data.Entities.Teachers;

public class TeacherProfile : BaseEntity, ITenantEntity
{
    public Guid UserId { get; set; }
    public virtual User User { get; set; } = default!;

    public string? Subject { get; set; }
    public string? Bio { get; set; }

    public Guid? CenterId { get; set; }
    public virtual Center? Center { get; set; }
}

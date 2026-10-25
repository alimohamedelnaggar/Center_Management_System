using CenterManagement.Data.Entities.Identity;

namespace CenterManagement.Data.Entities.Users;

/// <summary>
/// Links a parent login account (<see cref="User"/> with the "Parent" role) to
/// one of his children. A parent can be linked to many students and a student
/// can be linked to more than one parent; the pair is unique.
/// </summary>
public class ParentStudentLink : BaseEntity, ITenantEntity
{
    public Guid ParentUserId { get; set; }
    public User? ParentUser { get; set; }

    public Guid StudentId { get; set; }
    public Student? Student { get; set; }

    public Guid? CenterId { get; set; }
    public virtual Center? Center { get; set; }
}

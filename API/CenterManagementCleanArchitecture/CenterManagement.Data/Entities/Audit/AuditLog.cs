namespace CenterManagement.Data.Entities.Audit;

/// <summary>
/// Append-only record of privileged actions performed by platform operators
/// (creating/suspending centers, impersonation, password resets, ...).
/// Not tenant filtered on purpose so the super admin can audit every center.
/// </summary>
public class AuditLog
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid? ActorUserId { get; set; }

    public string Action { get; set; } = default!;

    public string? EntityType { get; set; }

    public string? EntityId { get; set; }

    public string? Details { get; set; }

    public string? IpAddress { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

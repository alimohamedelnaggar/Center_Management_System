using CenterManagement.Data.Entities;

namespace CenterManagement.Data.Entities.Subscriptions;

/// <summary>
/// Per-center feature toggle. A row exists per (center, module) pair. When
/// <see cref="IsEnabled"/> is false the module's endpoints return
/// <c>MODULE_DISABLED</c>. Managed by SuperAdmin only.
/// </summary>
public class CenterModule : BaseEntity, ITenantEntity
{
    public Guid? CenterId { get; set; }
    public virtual Center? Center { get; set; }

    public string ModuleKey { get; set; } = default!;

    public bool IsEnabled { get; set; } = true;
}

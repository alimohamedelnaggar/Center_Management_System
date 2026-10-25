using CenterManagement.Data.Entities.Identity;
using CenterManagement.Data.Entities.Subscriptions;
using CenterManagement.Data.Enums;

namespace CenterManagement.Data.Entities;

public class Center : BaseEntity
{
    public string Name { get; set; } = default!;
    public string? LogoUrl { get; set; }
    public string? Phone { get; set; }
    public string? Address { get; set; }
    public string? ThemeColor { get; set; }
    public string? Description { get; set; }

    public CenterType Type { get; set; } = CenterType.MultiTeacher;
    public CenterStatus Status { get; set; } = CenterStatus.Active;

    public DateTime? SubscriptionStart { get; set; }
    public DateTime? SubscriptionEnd { get; set; }
    public string? Plan { get; set; }
    public string? Notes { get; set; }

    /// <summary>
    /// Extra days after <see cref="SubscriptionEnd"/> during which the center keeps
    /// full access before it becomes <c>Expired</c>. SuperAdmin-only. 0 disables grace.
    /// </summary>
    public int GraceDays { get; set; } = 3;

    public bool IsActive { get; set; } = true;
    public Guid? OwnerId { get; set; }
    public virtual User? Owner { get; set; }
    public virtual ICollection<Center> SubCenters { get; set; } = [];

    public virtual ICollection<CenterModule> Modules { get; set; } = [];
    public virtual ICollection<CenterSubscription> Subscriptions { get; set; } = [];
}

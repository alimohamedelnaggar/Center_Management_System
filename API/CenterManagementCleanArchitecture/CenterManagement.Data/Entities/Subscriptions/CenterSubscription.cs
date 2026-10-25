using CenterManagement.Data.Entities;
using CenterManagement.Data.Enums;

namespace CenterManagement.Data.Entities.Subscriptions;

/// <summary>
/// Source of truth for a center's subscription period. <see cref="Center.Plan"/>
/// remains a display label only. A null <see cref="EndDate"/> means Lifetime.
/// </summary>
public class CenterSubscription : BaseEntity, ITenantEntity
{
    public Guid? CenterId { get; set; }
    public virtual Center? Center { get; set; }

    public SubscriptionPlanType Type { get; set; }

    public DateTime StartDate { get; set; }

    /// <summary>Null for <see cref="SubscriptionPlanType.Lifetime"/>.</summary>
    public DateTime? EndDate { get; set; }

    public decimal Price { get; set; }
    public decimal PaidAmount { get; set; }

    public string? Currency { get; set; }
    public string? Notes { get; set; }

    public virtual ICollection<CenterSubscriptionPayment> Payments { get; set; } = [];
}

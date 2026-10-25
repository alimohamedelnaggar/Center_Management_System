using CenterManagement.Data.Entities;

namespace CenterManagement.Data.Entities.Subscriptions;

/// <summary>An individual payment recorded against a <see cref="CenterSubscription"/>.</summary>
public class CenterSubscriptionPayment : BaseEntity, ITenantEntity
{
    public Guid? CenterId { get; set; }
    public virtual Center? Center { get; set; }

    public Guid CenterSubscriptionId { get; set; }
    public virtual CenterSubscription CenterSubscription { get; set; } = default!;

    public decimal Amount { get; set; }
    public DateTime PaidAt { get; set; } = DateTime.UtcNow;

    public string? Method { get; set; }
    public string? Note { get; set; }
}

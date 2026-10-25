using CenterManagement.Core.Bases;
using CenterManagement.Core.Features.Subscriptions.Queries.Models;
using CenterManagement.Data.Enums;
using MediatR;

namespace CenterManagement.Core.Features.Subscriptions.Commands.Models;

/// <summary>
/// SuperAdmin manually sets a center's subscription period (start/end/price/grace).
/// Unlike a renewal this does not shift the start date automatically; it is the
/// free-form "edit" path used by the subscription form.
/// </summary>
public class UpdateCenterSubscriptionCommand : IRequest<Response<CenterSubscriptionDetailDto>>
{
    public Guid CenterId { get; set; }

    public SubscriptionPlanType Type { get; set; } = SubscriptionPlanType.Annual;

    public DateTime StartDate { get; set; }

    /// <summary>Ignored for <see cref="SubscriptionPlanType.Lifetime"/> (end becomes null).</summary>
    public DateTime? EndDate { get; set; }

    public decimal Price { get; set; }
    public decimal PaidAmount { get; set; }
    public string? Currency { get; set; }

    /// <summary>Extra days after the end date before the center is locked. 0 disables grace.</summary>
    public int GraceDays { get; set; } = 3;

    /// <summary>Free-text display label. Falls back to the plan type's Arabic name.</summary>
    public string? Plan { get; set; }

    public string? Notes { get; set; }
}

/// <summary>
/// SuperAdmin renews a subscription. The renewal window matters: a center that is
/// currently in grace (or expired) is renewed starting from its ORIGINAL end date,
/// so the customer does not lose the days he already paid for. An active or
/// lifetime-less center is renewed from today.
/// </summary>
public class RenewCenterSubscriptionCommand : IRequest<Response<CenterSubscriptionDetailDto>>
{
    public Guid CenterId { get; set; }

    public SubscriptionPlanType Type { get; set; } = SubscriptionPlanType.Annual;

    public decimal Price { get; set; }
    public decimal PaidAmount { get; set; }
    public string? Currency { get; set; }
    public string? Plan { get; set; }
    public string? Notes { get; set; }
}

/// <summary>
/// SuperAdmin records a payment against a center's current subscription. The
/// subscription's <c>PaidAmount</c> is incremented by the payment amount.
/// </summary>
public class AddCenterSubscriptionPaymentCommand : IRequest<Response<CenterSubscriptionHistoryDto>>
{
    public Guid CenterId { get; set; }
    public decimal Amount { get; set; }
    public DateTime? PaidAt { get; set; }
    public string? Method { get; set; }
    public string? Note { get; set; }
}

/// <summary>
/// SuperAdmin replaces the enabled module set of a center. Missing prerequisite
/// modules are auto-enabled; disabling a module that an enabled module requires is
/// rejected unless <see cref="DisableDependents"/> is set (then those dependents are
/// disabled too). The module cache is invalidated immediately.
/// </summary>
public class UpdateCenterModulesCommand : IRequest<Response<CenterModuleResolutionDto>>
{
    public Guid CenterId { get; set; }
    public List<string> EnabledModules { get; set; } = [];
    public bool DisableDependents { get; set; }
}

using CenterManagement.Api.Base;
using CenterManagement.Core.Features.Subscriptions.Commands.Models;
using CenterManagement.Core.Features.Subscriptions.Queries.Models;
using CenterManagement.Data.AppMetaData;
using Microsoft.AspNetCore.Authorization;

namespace CenterManagement.Api.Controllers.Centers;

/// <summary>
/// SuperAdmin-only management of centers' subscriptions and enabled modules.
/// Every action is restricted to the platform administrator policy.
/// </summary>
public class CenterSubscriptionController : AppControllerBase
{
    /// <summary>List of all centers with their derived subscription state.</summary>
    [HttpGet(Routing.CenterRouting.Subscriptions)]
    [Authorize(Policy = AppPolicies.PlatformAdmin)]
    [PlatformEndpoint]
    public async Task<IActionResult> Subscriptions([FromQuery] GetCenterSubscriptionsQuery query)
    {
        var response = await _mediator.Send(query ?? new GetCenterSubscriptionsQuery());
        return NewResult(response);
    }

    /// <summary>Full subscription + module configuration of a single center.</summary>
    [HttpGet(Routing.CenterRouting.SubscriptionDetail)]
    [Authorize(Policy = AppPolicies.PlatformAdmin)]
    [PlatformEndpoint]
    public async Task<IActionResult> SubscriptionDetail([FromRoute] Guid id)
    {
        var response = await _mediator.Send(new GetCenterSubscriptionQuery { CenterId = id });
        return NewResult(response);
    }

    /// <summary>Subscription history (all periods + payments + remaining balance).</summary>
    [HttpGet(Routing.CenterRouting.SubscriptionHistory)]
    [Authorize(Policy = AppPolicies.PlatformAdmin)]
    [PlatformEndpoint]
    public async Task<IActionResult> SubscriptionHistory([FromRoute] Guid id)
    {
        var response = await _mediator.Send(new GetCenterSubscriptionHistoryQuery { CenterId = id });
        return NewResult(response);
    }

    /// <summary>Manually set a center's subscription window, price and grace days.</summary>
    [HttpPut(Routing.CenterRouting.UpdateSubscription)]
    [Authorize(Policy = AppPolicies.PlatformAdmin)]
    [PlatformEndpoint]
    public async Task<IActionResult> UpdateSubscription([FromBody] UpdateCenterSubscriptionCommand command)
    {
        var response = await _mediator.Send(command);
        return NewResult(response);
    }

    /// <summary>Record a payment against a center's current subscription.</summary>
    [HttpPost(Routing.CenterRouting.AddSubscriptionPayment)]
    [Authorize(Policy = AppPolicies.PlatformAdmin)]
    [PlatformEndpoint]
    public async Task<IActionResult> AddSubscriptionPayment([FromBody] AddCenterSubscriptionPaymentCommand command)
    {
        var response = await _mediator.Send(command);
        return NewResult(response);
    }

    /// <summary>Renew a subscription (resumes from the original end date when in grace).</summary>
    [HttpPost(Routing.CenterRouting.RenewSubscription)]
    [Authorize(Policy = AppPolicies.PlatformAdmin)]
    [PlatformEndpoint]
    public async Task<IActionResult> RenewSubscription([FromRoute] Guid id, [FromBody] RenewCenterSubscriptionCommand command)
    {
        command.CenterId = id;
        var response = await _mediator.Send(command);
        return NewResult(response);
    }

    /// <summary>Replace the enabled module set (auto-enables prerequisites, invalidates the cache).</summary>
    [HttpPut(Routing.CenterRouting.UpdateModules)]
    [Authorize(Policy = AppPolicies.PlatformAdmin)]
    [PlatformEndpoint]
    public async Task<IActionResult> UpdateModules([FromBody] UpdateCenterModulesCommand command)
    {
        var response = await _mediator.Send(command);
        return NewResult(response);
    }

    /// <summary>Resolve a proposed module set without persisting (preview auto-enabled/blocked).</summary>
    [HttpGet(Routing.CenterRouting.PreviewModules)]
    [Authorize(Policy = AppPolicies.PlatformAdmin)]
    [PlatformEndpoint]
    public async Task<IActionResult> PreviewModules([FromQuery] PreviewCenterModulesQuery query)
    {
        var response = await _mediator.Send(query);
        return NewResult(response);
    }
}

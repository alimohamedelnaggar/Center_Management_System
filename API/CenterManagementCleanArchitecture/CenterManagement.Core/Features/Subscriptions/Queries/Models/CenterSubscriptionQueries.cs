using CenterManagement.Core.Bases;
using CenterManagement.Core.Features.Subscriptions.Queries.Models;
using MediatR;

namespace CenterManagement.Core.Features.Subscriptions.Queries.Models;

/// <summary>SuperAdmin: list of every center with its derived subscription state.</summary>
public class GetCenterSubscriptionsQuery : IRequest<Response<List<CenterSubscriptionListItemDto>>>
{
    /// <summary>Optional name/phone filter.</summary>
    public string? Search { get; set; }
}

/// <summary>SuperAdmin: full subscription + module configuration of one center.</summary>
public class GetCenterSubscriptionQuery : IRequest<Response<CenterSubscriptionDetailDto>>
{
    public Guid CenterId { get; set; }
}

/// <summary>
/// SuperAdmin: the subscription history of one center (one row per period) with
/// the payments recorded against each period and the outstanding balance.
/// </summary>
public class GetCenterSubscriptionHistoryQuery : IRequest<Response<CenterSubscriptionHistoryDto>>
{
    public Guid CenterId { get; set; }
}

/// <summary>
/// SuperAdmin: resolve a proposed module set WITHOUT persisting it, so the UI can
/// preview which modules will be auto-enabled and which disables are blocked.
/// </summary>
public class PreviewCenterModulesQuery : IRequest<Response<CenterModuleResolutionDto>>
{
    public Guid CenterId { get; set; }
    public List<string> EnabledModules { get; set; } = [];

    /// <summary>When true, previews the result as if dependents were disabled too.</summary>
    public bool DisableDependents { get; set; }
}

using CenterManagement.Core.Features.NotificationFeature.Dtos;

namespace CenterManagement.Core.Features.ParentPortalFeature.Queries.Models;

/// <summary>
/// Paged list of the signed-in parent's notifications. Only rows that point at
/// one of his <em>current</em> children are ever returned, so a removed link
/// hides its history from the list immediately.
/// </summary>
public class GetParentNotificationsQuery
    : IRequest<Response<PaginatedResult<NotificationDTO>>>
{
    public int PageNumber { get; set; } = 1;
    public int PageSize { get; set; } = 10;
}

public class GetParentUnreadNotificationsCountQuery : IRequest<Response<int>>
{
}

using CenterManagement.Core.Features.ParentPortalFeature.Dtos;

namespace CenterManagement.Core.Features.ParentPortalFeature.Queries.Models;

/// <summary>Children of the currently signed-in parent (resolved from the JWT).</summary>
public class GetMyChildrenQuery : IRequest<Response<List<ParentChildDTO>>>
{
}

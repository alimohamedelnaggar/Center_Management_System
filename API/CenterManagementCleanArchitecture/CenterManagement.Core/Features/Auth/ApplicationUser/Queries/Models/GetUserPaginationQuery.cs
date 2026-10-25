
namespace CenterManagement.Core.Features.Auth.ApplicationUser.Queries.Models;

public class GetUserPaginationQuery : IRequest<PaginatedResult<GetUserPaginationReponse>>
{
    public int PageNumber { get; set; }
    public int PageSize { get; set; }
}

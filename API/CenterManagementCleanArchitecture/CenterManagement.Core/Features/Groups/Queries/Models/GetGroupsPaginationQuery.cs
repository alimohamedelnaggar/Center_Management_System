

namespace CenterManagement.Core.Features.Groups.Queries.Models
{
    public class GetGroupsPaginationQuery : IRequest<PaginatedResult<GetGroupsPaginationResponse>>
    {
        public int PageNumber { get; set; } = 1;

        public int PageSize { get; set; } = 10;

        public string? Search { get; set; }
    }
}

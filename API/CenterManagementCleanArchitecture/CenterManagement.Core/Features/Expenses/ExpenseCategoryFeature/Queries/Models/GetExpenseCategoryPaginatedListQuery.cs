using CenterManagement.Core.Features.ExpenseCategoryFeature.Queries.Results;

namespace CenterManagement.Core.Features.ExpenseCategoryFeature.Queries.Models;

public class GetExpenseCategoryPaginatedListQuery :
    IRequest<Response<PaginatedResult<GetExpenseCateogryPaginatedListResponse>>>
{
    public int PageNumber { get; set; }
    public int PageSize { get; set; }
}

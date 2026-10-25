using CenterManagement.Core.Features.ExpenseFeature.Students.Queries.Results;

namespace CenterManagement.Core.Features.ExpenseFeature.Students.Queries.Models;

public class GetExpensePaginatedListQuery :
    IRequest<Response<PaginatedResult<GetExpensePaginatedListResponse>>>
{
    public int PageNumber { get; set; }
    public int PageSize { get; set; }
    public string? Search { get; set; }
    public Guid? CategoryId { get; set; }
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
}

public record GetExpenseByIdQuery(Guid Id)
    : IRequest<Response<ExpenseDTO>>;
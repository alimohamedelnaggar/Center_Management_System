using CenterManagement.Core.Features.ExpenseCategoryFeature.Queries.Results;

namespace CenterManagement.Core.Features.ExpenseCategoryFeature.Queries.Models;

public class GetExpenseCategoryistQuery :
    IRequest<Response<List<ExpenseCategoryDTO>>>
{
}

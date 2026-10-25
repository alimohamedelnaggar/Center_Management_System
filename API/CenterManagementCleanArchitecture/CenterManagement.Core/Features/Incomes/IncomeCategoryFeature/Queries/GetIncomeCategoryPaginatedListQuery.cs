using CenterManagement.Core.Bases;
using CenterManagement.Core.Features.IncomeCategoryFeature.Queries.Results;
using CenterManagement.Core.Features.Incomes.IncomeCategoryFeature.Dtos;
using MediatR;

namespace CenterManagement.Core.Features.IncomeCategoryFeature.Queries.Models;

public class GetIncomeCategoryPaginatedListQuery : IRequest<Response<PaginatedResult<GetIncomeCategoryPaginatedListResponse>>>
{
    public int PageNumber { get; set; } = 1;
    public int PageSize { get; set; } = 10;
}
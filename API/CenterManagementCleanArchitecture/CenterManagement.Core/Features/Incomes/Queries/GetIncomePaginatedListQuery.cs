using CenterManagement.Core.Bases;
using CenterManagement.Core.Features.IncomeFeature.Queries.Results;
using CenterManagement.Core.Features.Incomes.Dtos;
using MediatR;

namespace CenterManagement.Core.Features.IncomeFeature.Queries.Models;

public class GetIncomePaginatedListQuery : IRequest<Response<PaginatedResult<GetIncomePaginatedListResponse>>>
{
    public int PageNumber { get; set; } = 1;
    public int PageSize { get; set; } = 10;
    public string? Search { get; set; }
    public Guid? CategoryId { get; set; }
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
}

public class GetIncomeByIdQuery : IRequest<Response<IncomeDTO>>
{
    public Guid Id { get; set; }
    public GetIncomeByIdQuery(Guid id) => Id = id;
}
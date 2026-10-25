using CenterManagement.Core.Bases;
using CenterManagement.Core.Features.IncomeCategoryFeature.Queries.Models;
using CenterManagement.Core.Features.IncomeCategoryFeature.Queries.Results;
using CenterManagement.Core.Features.Incomes.IncomeCategoryFeature.Dtos;
using CenterManagement.Infrustructure.InfrastructureBases.Bases;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Localization;

namespace CenterManagement.Core.Features.IncomeCategoryFeature.Queries.Handlers;

public class IncomeCategoryQueryHandler
    : ResponseHandler,
      IRequestHandler<GetIncomeCategoryListQuery, Response<List<IncomeCategoryDTO>>>,
      IRequestHandler<GetIncomeCategoryPaginatedListQuery, Response<PaginatedResult<GetIncomeCategoryPaginatedListResponse>>>
{
    private readonly IRepositoryManager _repositoryManager;

    public IncomeCategoryQueryHandler(
        IRepositoryManager repositoryManager,
        IStringLocalizer<SharedResources> stringLocalizer)
        : base(stringLocalizer)
    {
        _repositoryManager = repositoryManager;
    }

    public async Task<Response<List<IncomeCategoryDTO>>> Handle(GetIncomeCategoryListQuery request, CancellationToken cancellationToken)
    {
        var categories = await _repositoryManager
            .IncomeCategoryRepository
            .GetTableNoTracking()
            .Where(x => x.IsDeleted == false)
            .Select(x => new IncomeCategoryDTO
            {
                Id = x.Id,
                Name = x.Name
            })
            .ToListAsync(cancellationToken);

        return Success(categories);
    }

    public async Task<Response<PaginatedResult<GetIncomeCategoryPaginatedListResponse>>> Handle(GetIncomeCategoryPaginatedListQuery request, CancellationToken cancellationToken)
    {
        var query = _repositoryManager
            .IncomeCategoryRepository
            .GetTableNoTracking()
            .Where(x => x.IsDeleted == false);

        var totalCount = await query.CountAsync(cancellationToken);

        var categories = await query
            .OrderByDescending(x => x.CreatedAt)
            .Skip((request.PageNumber - 1) * request.PageSize)
            .Take(request.PageSize)
            .Select(x => new GetIncomeCategoryPaginatedListResponse
            {
                Id = x.Id,
                Name = x.Name
            })
            .ToListAsync(cancellationToken);

        var paginatedResult = PaginatedResult<GetIncomeCategoryPaginatedListResponse>.Success(
            categories,
            totalCount,
            request.PageNumber,
            request.PageSize);

        return Success(paginatedResult);
    }
}
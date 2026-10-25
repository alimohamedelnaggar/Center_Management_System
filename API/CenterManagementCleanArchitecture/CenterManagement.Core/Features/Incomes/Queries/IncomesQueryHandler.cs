using CenterManagement.Core.Bases;
using CenterManagement.Core.Features.IncomeFeature.Queries.Models;
using CenterManagement.Core.Features.IncomeFeature.Queries.Results;
using CenterManagement.Core.Features.Incomes.Dtos;
using CenterManagement.Data.Entities.Abstractions;
using CenterManagement.Infrustructure.InfrastructureBases.Bases;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Localization;

namespace CenterManagement.Core.Features.IncomeFeature.Queries.Handlers;

public class IncomesQueryHandler
    : ResponseHandler,
      IRequestHandler<GetIncomePaginatedListQuery, Response<PaginatedResult<GetIncomePaginatedListResponse>>>,
      IRequestHandler<GetIncomeByIdQuery, Response<IncomeDTO>>
{
    private readonly IRepositoryManager _repositoryManager;
    private readonly IUserScopeService _scopeService;

    public IncomesQueryHandler(
        IRepositoryManager repositoryManager,
        IUserScopeService scopeService,
        IStringLocalizer<SharedResources> stringLocalizer)
        : base(stringLocalizer)
    {
        _repositoryManager = repositoryManager;
        _scopeService = scopeService;
    }

    public async Task<Response<PaginatedResult<GetIncomePaginatedListResponse>>> Handle(GetIncomePaginatedListQuery request, CancellationToken cancellationToken)
    {
        var scope = await _scopeService.ResolveAsync(cancellationToken);

        var query = _repositoryManager
            .IncomeRepository
            .GetTableNoTracking()
            .Where(e => e.IsDeleted == false)
            .Include(x => x.Category)
            .AsQueryable();

        // A regular teacher only sees income recorded against his own groups.
        if (!scope.CenterWide)
            query = query.Where(x => x.GroupId != null && scope.GroupIds.Contains(x.GroupId.Value));

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var search = request.Search.Trim();

            query = query.Where(x =>
                x.Name.Contains(search) ||
                x.Category.Name.Contains(search));
        }

        if (request.CategoryId.HasValue)
        {
            query = query.Where(x =>
                x.CategoryId == request.CategoryId.Value);
        }

        if (request.StartDate.HasValue)
        {
            var startDate = DateOnly.FromDateTime(request.StartDate.Value);

            query = query.Where(x =>
                x.IncomeDate >= startDate);
        }

        if (request.EndDate.HasValue)
        {
            var endDate = DateOnly.FromDateTime(request.EndDate.Value);

            query = query.Where(x =>
                x.IncomeDate <= endDate);
        }

        var totalCount = await query.CountAsync(cancellationToken);

        var incomes = await query
            .OrderByDescending(x => x.IncomeDate)
            .ThenByDescending(x => x.CreatedAt)
            .Skip((request.PageNumber - 1) * request.PageSize)
            .Take(request.PageSize)
            .Select(x => new GetIncomePaginatedListResponse
            {
                Id = x.Id,
                Name = x.Name,
                CategoryName = x.Category.Name,
                CategoryId = x.CategoryId,
                Amount = x.Amount,
                IncomeDate = x.IncomeDate,
                Notes = x.Notes,
                GroupId = x.GroupId
            })
            .ToListAsync(cancellationToken);

        var paginatedResult = PaginatedResult<GetIncomePaginatedListResponse>.Success(
            incomes,
            totalCount,
            request.PageNumber,
            request.PageSize);

        return Success(paginatedResult);
    }

    public async Task<Response<IncomeDTO>> Handle(GetIncomeByIdQuery request, CancellationToken cancellationToken)
    {
        var income = await _repositoryManager
           .IncomeRepository
           .GetByIdWithIncludeAsync(request.Id, e => e.Category);

        if (income is null || income.IsDeleted)
            return NotFound<IncomeDTO>("الإيراد غير موجود.");

        var scope = await _scopeService.ResolveAsync(cancellationToken);

        if (!scope.CenterWide
            && (income.GroupId is null || !scope.Allows(income.GroupId.Value)))
            return NotFound<IncomeDTO>("الإيراد غير موجود.");

        var response = new IncomeDTO
        {
            Id = income.Id,
            Name = income.Name,
            CategoryName = income.Category.Name,
            CategoryId = income.CategoryId,
            Amount = income.Amount,
            IncomeDate = income.IncomeDate,
            Notes = income.Notes,
            GroupId = income.GroupId
        };

        return Success(response);
    }
}
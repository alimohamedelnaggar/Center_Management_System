using CenterManagement.Core.Features.ExpenseFeature.Students.Queries.Models;
using CenterManagement.Core.Features.ExpenseFeature.Students.Queries.Results;
using CenterManagement.Infrustructure.InfrastructureBases.Bases;

namespace CenterManagement.Core.Features.ExpenseFeature.Students.Queries.Handlers;

public class ExpensesQueryHandler
    : ResponseHandler,
      IRequestHandler<GetExpensePaginatedListQuery, Response<PaginatedResult<GetExpensePaginatedListResponse>>>,
          IRequestHandler<GetExpenseByIdQuery, Response<ExpenseDTO>>

{
    private readonly IRepositoryManager _repositoryManager;

    public ExpensesQueryHandler(
        IRepositoryManager repositoryManager,
        IStringLocalizer<SharedResources> stringLocalizer)
        : base(stringLocalizer)
    {
        _repositoryManager = repositoryManager;
    }

    public async Task<Response<PaginatedResult<GetExpensePaginatedListResponse>>> Handle(GetExpensePaginatedListQuery request, CancellationToken cancellationToken)
    {
        var query = _repositoryManager
            .ExpenseRepository
            .GetTableNoTracking()
            .Where(e => e.IsDeleted == false)
            .Include(x => x.Category)
            .AsQueryable();

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
                x.ExpenseDate >= startDate);
        }

        if (request.EndDate.HasValue)
        {
            var endDate = DateOnly.FromDateTime(request.EndDate.Value);

            query = query.Where(x =>
                x.ExpenseDate <= endDate);
        }

        var totalCount = await query.CountAsync(cancellationToken);

        var expenses = await query
            .OrderByDescending(x => x.ExpenseDate)
            .ThenByDescending(x => x.CreatedAt)
            .Skip((request.PageNumber - 1) * request.PageSize)
            .Take(request.PageSize)
            .Select(x => new GetExpensePaginatedListResponse
            {
                Id = x.Id,
                Name = x.Name,
                CategoryName = x.Category.Name,
                CategoryId=x.CategoryId,
                Amount = x.Amount,
                ExpenseDate = x.ExpenseDate,
                Notes = x.Notes
            })
            .ToListAsync(cancellationToken);

        var paginatedResult = PaginatedResult<GetExpensePaginatedListResponse>.Success(
            expenses,
            totalCount,
            request.PageNumber,
            request.PageSize);

        return Success(paginatedResult);
    }

    public async Task<Response<ExpenseDTO>> Handle(GetExpenseByIdQuery request, CancellationToken cancellationToken)
    {
        var expense = await _repositoryManager
           .ExpenseRepository
           .GetByIdWithIncludeAsync(request.Id, e => e.Category);

        if (expense is null)
            return NotFound<ExpenseDTO>("المصروف غير موجود.");

        var response = new ExpenseDTO
        {
            Id = expense.Id,
            Name = expense.Name,
            CategoryName = expense.Category.Name,
            Amount = expense.Amount,
            ExpenseDate = expense.ExpenseDate,
            Notes = expense.Notes
        };

        return Success(response);
    }
}
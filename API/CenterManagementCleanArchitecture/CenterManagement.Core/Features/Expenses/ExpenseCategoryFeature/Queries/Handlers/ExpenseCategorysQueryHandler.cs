using CenterManagement.Core.Features.ExpenseCategoryFeature.Queries.Models;
using CenterManagement.Core.Features.ExpenseCategoryFeature.Queries.Results;
using CenterManagement.Infrustructure.InfrastructureBases.Bases;

namespace CenterManagement.Core.Features.ExpenseCategoryFeature.Queries.Handlers;

public class ExpenseCategorysQueryHandler
    : ResponseHandler,
      IRequestHandler<GetExpenseCategoryPaginatedListQuery,
          Response<PaginatedResult<GetExpenseCateogryPaginatedListResponse>>>,
      IRequestHandler<GetExpenseCategoryistQuery,
          Response<List<ExpenseCategoryDTO>>>
{
    private readonly IRepositoryManager _repositoryManager;

    public ExpenseCategorysQueryHandler(
        IRepositoryManager repositoryManager,
        IStringLocalizer<SharedResources> stringLocalizer) : base(stringLocalizer)
    {
        _repositoryManager = repositoryManager;
    }


    public async Task<Response<PaginatedResult<GetExpenseCateogryPaginatedListResponse>>>
        Handle(GetExpenseCategoryPaginatedListQuery request, CancellationToken cancellationToken)
    {
        var query = _repositoryManager
            .ExpenseCategoryRepository
            .GetTableNoTracking()
               .Where(c => c.IsDeleted == false)
            .AsQueryable();


        var totalCount = await query.CountAsync(cancellationToken);

        var ExpenseCategories = await query
            .OrderByDescending(x => x.Name)
            .Skip((request.PageNumber - 1) * request.PageSize)
            .Take(request.PageSize)
            .Select(x => new GetExpenseCateogryPaginatedListResponse
            {
                Id = x.Id,
                Name = x.Name,
            })
            .ToListAsync(cancellationToken);

        var paginatedResult = PaginatedResult<GetExpenseCateogryPaginatedListResponse>.Success(
            ExpenseCategories,
            totalCount,
            request.PageNumber,
            request.PageSize);

        return Success(paginatedResult);
    }

    public async Task<Response<List<ExpenseCategoryDTO>>> Handle(GetExpenseCategoryistQuery request, CancellationToken cancellationToken)
    {
        try
        {

            var query = _repositoryManager
               .ExpenseCategoryRepository
               .GetTableNoTracking()
               .Where(c => c.IsDeleted == false)
               .AsQueryable();
            if (query is null)
                return NotFound<List<ExpenseCategoryDTO>>("لا توجد فئات حتي الان , برجاء اضافة فئة اولا");

            var ExpenseCategories = await query
                .OrderByDescending(x => x.Name)
                .Select(x => new ExpenseCategoryDTO
                {
                    Id = x.Id,
                    Name = x.Name,
                })
                .ToListAsync(cancellationToken);


            return Success(ExpenseCategories, "تم ارجاح الفئات بنجاح");

        }
        catch (Exception)
        {
            return BadRequest<List<ExpenseCategoryDTO>>("فشل في ارجاع الفئات");

        }
    }
}
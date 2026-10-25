using CenterManagement.Infrustructure.InfrastructureBases.Bases;

namespace CenterManagement.Infrustructure.Repositories.Base;

public class GenericRepository<T> : IGenericRepository<T> where T : class
{

    #region Vars / Props

    protected readonly AppDbContext _dbContext;

    #endregion

    #region Constructor
    public GenericRepository(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    #endregion

    #region Methods

    // -------------------- Create
    public virtual async Task AddRangeAsync(ICollection<T> entities)
    {
        await _dbContext.Set<T>().AddRangeAsync(entities);

    }
    public virtual async Task<T> AddAsync(T entity)
    {
        await _dbContext.Set<T>().AddAsync(entity);

        return entity;
    }
    // -------------------- Read
    public async Task<IEnumerable<T>> FindAllAsync(Expression<Func<T, bool>> predicate)
    {
        return await _dbContext.Set<T>()
            .Where(predicate)
            .ToListAsync();
    }

    public async Task<bool> IsNameExistExceptSelf(Expression<Func<T, bool>> predicate)
    {
        return await _dbContext.Set<T>().AnyAsync(predicate);
    }

    public async Task<int> CountAsync()
    {
        return await _dbContext.Set<T>().CountAsync();
    }
    public virtual async Task<T> GetByIdAsync(Guid id)
    {

        return await _dbContext.Set<T>().FindAsync(id);
    }
    public IQueryable<T> GetTableNoTracking(BaseSpecification<T>? specification = null)
    {
        //if(specification != null? specification.Criteria != null:false )
        if (specification?.Criteria != null)
            return _dbContext.Set<T>().Where(specification.Criteria).AsNoTracking().AsQueryable();

        return _dbContext.Set<T>().AsNoTracking().AsQueryable();
    }
    public IQueryable<T> GetTableTracking(BaseSpecification<T>? specification = null)
    {
        if (specification?.Criteria != null)
            return _dbContext.Set<T>()
                .Where(specification.Criteria)
                .AsQueryable();

        return _dbContext.Set<T>().AsQueryable();
    }

    public async Task<T> GetByIdWithIncludeAsync(Guid id, params Expression<Func<T, object>>[] includes)
    {
        IQueryable<T> query = _dbContext.Set<T>();

        foreach (var include in includes)
            query = query.Include(include);

        return await query.FirstOrDefaultAsync(e =>
            EF.Property<Guid>(e, "Id") == id);
    }
    public async Task<T> GetByConditionAsync(Guid id, params Expression<Func<T, bool>>[] conditions)
    {
        IQueryable<T> query = _dbContext.Set<T>();

        foreach (var condition in conditions)
            query = query.Where(condition);

        return await query.FirstOrDefaultAsync(e =>
            EF.Property<Guid>(e, "Id") == id);
    }
    public IQueryable<T> GetTableAsTracking()
    {
        return _dbContext.Set<T>().AsQueryable();
    }


    //Pagination with condition (filter)
    public async Task<PagedResult<T>> GetPagedQuery(int pageIndex = 1, int pageSize = 10, BaseSpecification<T> specification = null)
    {
        IQueryable<T> query = _dbContext.Set<T>();

        if (specification != null && specification.Criteria != null)
            query = query.Where(specification.Criteria);

        // Get total count BEFORE paging
        int totalCount = query.Count();

        List<T> items = await query.Skip((pageIndex - 1) * pageSize).Take(pageSize).ToListAsync();

        return new PagedResult<T>
        {
            Items = items,
            TotalCount = totalCount,
            PageIndex = pageIndex,
            PageSize = pageSize
        };

    }


    // -------------------- Update
    public virtual async Task UpdateAsync(T entity)
    {
        _dbContext.Set<T>().Update(entity);
        await Task.CompletedTask;
    }
    public virtual async Task UpdateRangeAsync(ICollection<T> entities)
    {
        _dbContext.Set<T>().UpdateRange(entities);
        await Task.CompletedTask;
    }

    // -------------------- Delete
    public virtual async Task DeleteAsync(T entity)
    {
        _dbContext.Set<T>().Remove(entity);
        await Task.CompletedTask;
    }
    public virtual async Task DeleteRangeAsync(ICollection<T> entities)
    {
        foreach (var entity in entities)
        {
            _dbContext.Entry(entity).State = EntityState.Deleted;
        }
        await Task.CompletedTask;
    }








    #endregion
}

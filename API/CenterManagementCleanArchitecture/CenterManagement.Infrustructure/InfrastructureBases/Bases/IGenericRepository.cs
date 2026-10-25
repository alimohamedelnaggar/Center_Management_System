namespace CenterManagement.Infrustructure.InfrastructureBases;

public interface IGenericRepository<T>
{
    // -------------------- Create
    Task<T> AddAsync(T entity);
    Task AddRangeAsync(ICollection<T> entities);

    // -------------------- Read
    Task<bool> IsNameExistExceptSelf(Expression<Func<T, bool>> predicate);
    Task<T> GetByIdAsync(Guid id);
    Task<int> CountAsync();

    // get data using pagination  with  condition
    Task<PagedResult<T>> GetPagedQuery(int pageIndex, int pageSize, BaseSpecification<T> specification);
    IQueryable<T> GetTableNoTracking(BaseSpecification<T>? specification = null);
    IQueryable<T> GetTableTracking(BaseSpecification<T>? specification = null);
    Task<T> GetByIdWithIncludeAsync(Guid id, params Expression<Func<T, object>>[] includes);
    Task<T> GetByConditionAsync(Guid id, params Expression<Func<T, bool>>[] conditions);

    Task<IEnumerable<T>> FindAllAsync(Expression<Func<T, bool>> predicate);

    // -------------------- Update
    Task UpdateAsync(T entity);
    Task UpdateRangeAsync(ICollection<T> entities);

    // -------------------- Delete
    Task DeleteRangeAsync(ICollection<T> entities);
    Task DeleteAsync(T entity);

}



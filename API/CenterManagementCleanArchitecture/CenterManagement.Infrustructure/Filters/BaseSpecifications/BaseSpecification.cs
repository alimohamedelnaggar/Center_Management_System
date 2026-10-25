namespace CenterManagement.Infrustructure.Filters.BaseSpecifications;

public class BaseSpecification<T>
{
    public Expression<Func<T, bool>>? Criteria { get; private set; }

    protected void AddCriteria(Expression<Func<T, bool>> criteria)
    {
        Criteria = criteria;
    }
}

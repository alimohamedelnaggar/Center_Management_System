using CenterManagement.Data.Entities.Expenses;
using CenterManagement.Infrustructure.InfrastructureBases.Abstracts.Expenses;

namespace CenterManagement.Infrustructure.Repositories.Expenses;

public class ExpenseCategoryRepository : GenericRepository<ExpenseCategory>, IExpenseCategoryRepository
{
    #region Fields
    private readonly AppDbContext dbContext;
    #endregion

    #region Constructors
    public ExpenseCategoryRepository(AppDbContext dbContext) : base(dbContext)
    {
        this.dbContext = dbContext;
    }
    #endregion

    #region Handle Functions

    #endregion
}

using CenterManagement.Data.Entities.Incomes;
using CenterManagement.Infrustructure.InfrastructureBases.Abstracts.Incomes;

namespace CenterManagement.Infrustructure.Repositories.Incomes;

public class IncomeCategoryRepository : GenericRepository<IncomeCategory>, IIncomeCategoryRepository
{
    #region Fields
    private readonly AppDbContext dbContext;
    #endregion

    #region Constructors
    public IncomeCategoryRepository(AppDbContext dbContext) : base(dbContext)
    {
        this.dbContext = dbContext;
    }
    #endregion

    #region Handle Functions

    #endregion
}
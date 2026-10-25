using CenterManagement.Application.Contracts.Persistence;
using CenterManagement.Data.Entities.Incomes;
using CenterManagement.Infrustructure.InfrastructureBases.Abstracts.Incomes;

namespace CenterManagement.Infrustructure.Repositories.Incomes;

public class IncomeRepository : GenericRepository<Income>, IIncomeRepository
{
    #region Fields
    private readonly AppDbContext dbContext;
    #endregion

    #region Constructors
    public IncomeRepository(AppDbContext dbContext) : base(dbContext)
    {
        this.dbContext = dbContext;
    }
    #endregion

    #region Handle Functions

    #endregion
}
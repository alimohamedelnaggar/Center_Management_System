using CenterManagement.Data.Entities.Incomes;

namespace CenterManagement.Application.Contracts.Persistence;

public interface IIncomeRepository : IGenericRepository<Income> // أو IAsyncRepository حسب الاسم لديك
{
    
}
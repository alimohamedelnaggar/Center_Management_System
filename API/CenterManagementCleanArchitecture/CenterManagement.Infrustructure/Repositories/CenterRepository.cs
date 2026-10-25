using CenterManagement.Data.Entities;
using CenterManagement.Infrustructure.Data;
using CenterManagement.Infrustructure.InfrastructureBases.Abstracts;
using CenterManagement.Infrustructure.Repositories.Base;

namespace CenterManagement.Infrustructure.Repositories;

public class CenterRepository : GenericRepository<Center>, ICenterRepository
{
    public CenterRepository(AppDbContext dbContext) : base(dbContext)
    {
    }
}

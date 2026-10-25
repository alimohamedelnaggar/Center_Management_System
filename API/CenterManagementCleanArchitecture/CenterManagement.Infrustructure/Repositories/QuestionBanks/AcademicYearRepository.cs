using CenterManagement.Data.Entities.QuestionBank;
using CenterManagement.Infrustructure.InfrastructureBases.Abstracts.QuestionBanks;

namespace CenterManagement.Infrustructure.Repositories.QuestionBanks;

public class AcademicYearRepository :
    GenericRepository<AcademicYear>, IAcademicYearRepository
{
    private readonly AppDbContext dbContext;

    public AcademicYearRepository(AppDbContext dbContext) : base(dbContext)
    {
        this.dbContext = dbContext;
    }
}
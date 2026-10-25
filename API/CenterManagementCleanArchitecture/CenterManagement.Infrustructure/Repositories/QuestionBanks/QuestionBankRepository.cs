using CenterManagement.Data.Entities.QuestionBank;
using CenterManagement.Infrustructure.InfrastructureBases.Abstracts.QuestionBanks;

namespace CenterManagement.Infrustructure.Repositories.QuestionBanks;

public class QuestionBankRepository :
    GenericRepository<QuestionBank>, IQuestionBankRepository
{
    private readonly AppDbContext dbContext;

    public QuestionBankRepository(AppDbContext dbContext) : base(dbContext)
    {
        this.dbContext = dbContext;
    }
}
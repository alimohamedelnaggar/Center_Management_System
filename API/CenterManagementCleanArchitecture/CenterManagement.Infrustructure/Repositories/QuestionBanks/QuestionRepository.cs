using CenterManagement.Data.Entities.QuestionBank;
using CenterManagement.Infrustructure.InfrastructureBases.Abstracts.QuestionBanks;

namespace CenterManagement.Infrustructure.Repositories.QuestionBanks;

public class QuestionRepository :
    GenericRepository<Question>, IQuestionRepository
{
    private readonly AppDbContext dbContext;

    public QuestionRepository(AppDbContext dbContext) : base(dbContext)
    {
        this.dbContext = dbContext;
    }

    public async Task AddOptionsAsync(ICollection<QuestionOption> options)
    {
        await dbContext.Set<QuestionOption>().AddRangeAsync(options);
    }
}
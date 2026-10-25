using CenterManagement.Data.Entities.QuestionBank;
using CenterManagement.Infrustructure.InfrastructureBases.Abstracts.QuestionBanks;

namespace CenterManagement.Infrustructure.Repositories.QuestionBanks;

public class QuestionExamRepository :
    GenericRepository<QuestionExam>, IQuestionExamRepository
{
    private readonly AppDbContext dbContext;

    public QuestionExamRepository(AppDbContext context) : base(context)
    {
        dbContext = context;
    }

    public async Task AddQuestionsAsync(ICollection<QuestionExamQuestion> questions)
    {
        await dbContext.Set<QuestionExamQuestion>().AddRangeAsync(questions);
    }

    public async Task AddQuestionOptionsAsync(ICollection<QuestionExamQuestionOption> options)
    {
        await dbContext.Set<QuestionExamQuestionOption>().AddRangeAsync(options);
    }
}

using CenterManagement.Data.Entities.QuestionBank;
using CenterManagement.Infrustructure.InfrastructureBases.Abstracts.Students;

namespace CenterManagement.Infrustructure.Repositories.Students;

public class StudentExamAttemptRepository :
    GenericRepository<StudentExamAttempt>, IStudentExamAttemptRepository
{
    private readonly AppDbContext _dbContext;

    public StudentExamAttemptRepository(AppDbContext context) : base(context)
    {
        _dbContext = context;
    }

    public async Task AddAnswersAsync(ICollection<StudentExamAnswer> answers)
    {
        await _dbContext.Set<StudentExamAnswer>().AddRangeAsync(answers);
    }
}

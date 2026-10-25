using CenterManagement.Data.Entities.QuestionBank;
using CenterManagement.Infrustructure.InfrastructureBases.Bases;

namespace CenterManagement.Infrustructure.InfrastructureBases.Abstracts.Students;

public interface IStudentExamAttemptRepository : IGenericRepository<StudentExamAttempt>
{
    Task AddAnswersAsync(ICollection<StudentExamAnswer> answers);
}

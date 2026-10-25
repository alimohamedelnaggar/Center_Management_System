using CenterManagement.Data.Entities.QuestionBank;
using CenterManagement.Infrustructure.InfrastructureBases.Bases;

namespace CenterManagement.Infrustructure.InfrastructureBases.Abstracts.QuestionBanks;

public interface IQuestionExamRepository : IGenericRepository<QuestionExam>
{
    Task AddQuestionsAsync(ICollection<QuestionExamQuestion> questions);
    Task AddQuestionOptionsAsync(ICollection<QuestionExamQuestionOption> options);
}

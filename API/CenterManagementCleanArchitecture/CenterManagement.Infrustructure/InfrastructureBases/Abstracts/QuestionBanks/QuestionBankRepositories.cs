using CenterManagement.Data.Entities.QuestionBank;
using CenterManagement.Infrustructure.InfrastructureBases.Bases;

namespace CenterManagement.Infrustructure.InfrastructureBases.Abstracts.QuestionBanks;

public interface IAcademicYearRepository : IGenericRepository<AcademicYear>
{
}

public interface IQuestionBankRepository : IGenericRepository<QuestionBank>
{
}

public interface IQuestionRepository : IGenericRepository<Question>
{
    Task AddOptionsAsync(ICollection<QuestionOption> options);
}
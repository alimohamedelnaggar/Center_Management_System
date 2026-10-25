using CenterManagement.Data.Entities.Exams;
using CenterManagement.Infrustructure.Results;

namespace CenterManagement.Infrustructure.InfrastructureBases.Abstracts.Exams;

public interface IExamRepository : IGenericRepository<Exam>
{
    Task<List<StudentExamComponent>> GetStudentExamReportAsync(
    Guid studentId,
    CancellationToken cancellationToken = default);

    Task<ExamStatsDTO> GetExamStatsAsync(
       Guid groupId,
       Guid sessionId,
       Guid examId);

    Task DeleteExamWithResultsAsync(
    Guid examId,
    CancellationToken cancellationToken = default);
}

using CenterManagement.Data.Entities.Exams;

namespace CenterManagement.Infrustructure.InfrastructureBases.Abstracts.Exams;

public interface IStudentExamParentContactRepository
    : IGenericRepository<StudentExamParentContact>
{
    Task<StudentExamParentContact?> GetByStudentAndExamAsync(
        Guid studentId,
        Guid examId,
        CancellationToken cancellationToken = default);

    Task<StudentExamParentContact?> GetAsync(
       Guid studentId,
       Guid examId,
       CancellationToken cancellationToken);


    Task<List<StudentExamParentContact>> GetByStudentIdAsync(
     Guid studentId,
     CancellationToken cancellationToken);
}
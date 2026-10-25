using CenterManagement.Data.Entities.Exams;
using CenterManagement.Infrustructure.InfrastructureBases.Abstracts.Exams;
using Microsoft.EntityFrameworkCore;

namespace CenterManagement.Infrustructure.Repositories.Exams;

public class StudentExamParentContactRepository
    : GenericRepository<StudentExamParentContact>,
      IStudentExamParentContactRepository
{
    #region Fields

    private readonly AppDbContext dbContext;

    #endregion

    #region Constructors

    public StudentExamParentContactRepository(AppDbContext dbContext)
        : base(dbContext)
    {
        this.dbContext = dbContext;
    }

    #endregion

    #region Handle Functions

    public async Task<StudentExamParentContact?> GetByStudentAndExamAsync(
        Guid studentId,
        Guid examId,
        CancellationToken cancellationToken = default)
    {
        return await dbContext.StudentExamParentContacts
            .FirstOrDefaultAsync(
                x => x.StudentId == studentId &&
                     x.ExamId == examId,
                cancellationToken);
    }

    #endregion


    public async Task<StudentExamParentContact?> GetAsync(
    Guid studentId,
    Guid examId,
    CancellationToken cancellationToken)
    {
        return await _dbContext.StudentExamParentContacts
            .FirstOrDefaultAsync(
                x => x.StudentId == studentId &&
                     x.ExamId == examId,
                cancellationToken);
    }
    public async Task<List<StudentExamParentContact>> GetByStudentIdAsync(
    Guid studentId,
    CancellationToken cancellationToken)
    {
        return await _dbContext.StudentExamParentContacts
            .Where(x => x.StudentId == studentId)
            .ToListAsync(cancellationToken);
    }
}
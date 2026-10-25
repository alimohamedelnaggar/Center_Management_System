using CenterManagement.Data.Entities.Exams;
using CenterManagement.Infrustructure.InfrastructureBases.Abstracts.Exams;
using CenterManagement.Infrustructure.Results;

namespace CenterManagement.Infrustructure.Repositories.Exams;
public class ExamRepository : GenericRepository<Exam>, IExamRepository
{
    #region Fields
    private readonly AppDbContext dbContext;
    #endregion

    #region Constructors
    public ExamRepository(AppDbContext dbContext) : base(dbContext)
    {
        this.dbContext = dbContext;
    }
    #endregion

    #region Handle Functions

    #endregion
    public async Task<List<StudentExamComponent>> GetStudentExamReportAsync(
    Guid studentId,
    CancellationToken cancellationToken = default)
    {
        return await dbContext.StudentExamComponents
            .AsNoTracking()
            .Where(x => x.StudentId == studentId)
            .Include(x => x.ExamComponent)
                .ThenInclude(x => x.Exam)
            .OrderByDescending(x => x.ExamComponent.Exam.ExamDate)
            .ToListAsync(cancellationToken);
    }
    public async Task<ExamStatsDTO> GetExamStatsAsync(
    Guid groupId,
    Guid sessionId,
    Guid examId)
    {
        // إجمالي طلاب المجموعة
        var totalStudents = await dbContext.StudentGroups
            .Where(x => x.GroupId == groupId)
            .Select(x => x.StudentId)
            .Distinct()
            .CountAsync();

        // الطلاب الذين تم رصد درجاتهم
        var gradedStudents = await dbContext.StudentExamComponents
            .Where(x => x.ExamComponent.ExamId == examId)
            .Select(x => x.StudentId)
            .Distinct()
            .CountAsync();

        // متوسط الدرجات
        var averageMark = await dbContext.StudentExamComponents
            .Where(x => x.ExamComponent.ExamId == examId)
            .AverageAsync(x => (double?)x.Mark) ?? 0;

        return new ExamStatsDTO
        {
            TotalStudents = totalStudents,
            GradedStudents = gradedStudents,
            RemainingStudents = totalStudents - gradedStudents,
            AverageMark = Math.Round(averageMark, 2)
        };
    }
    public async Task DeleteExamWithResultsAsync(
    Guid examId,
    CancellationToken cancellationToken = default)
    {
        var exam = await dbContext.Exams
            .Include(x => x.ExamComponents)
            .ThenInclude(x => x.StudentMarks)
            .FirstOrDefaultAsync(x => x.Id == examId, cancellationToken);

        if (exam is null)
            return;

        foreach (var component in exam.ExamComponents)
        {
            dbContext.StudentExamComponents.RemoveRange(
                component.StudentMarks);
        }

        dbContext.ExamComponents.RemoveRange(exam.ExamComponents);

        dbContext.Exams.Remove(exam);
    }
}

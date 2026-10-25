using CenterManagement.Infrustructure.InfrastructureBases.Abstracts;

namespace CenterManagement.Infrustructure.Repositories.Users;

public class StudentRepository : GenericRepository<Student>, IStudentRepository
{
    #region Fields
    private readonly AppDbContext _context;
    #endregion

    #region Constructors
    public StudentRepository(AppDbContext dbContext) : base(dbContext)
    {
        _context = dbContext;
    }
    #endregion

    #region Handle Functions
    public async Task<Student?> GetByPhoneAsync(string phone)
    {
        return await _context.Students
            .FirstOrDefaultAsync(x => x.PhoneNumber == phone);
    }

    public async Task<Student?> GetByParentPhoneAsync(string parentPhone)
    {
        return await _context.Students
            .FirstOrDefaultAsync(x => x.ParentPhoneNumber == parentPhone);
    }

    public IQueryable<Student> GetStudentsFinanceQuery()
    {
        // Inactive students are excluded from current finance operations.
        // Their payments are never deleted - this only scopes the query.
        return _context.Students
            .AsNoTracking()
            .Where(x => x.IsActive)
            .Include(x => x.StudentGroups)
                .ThenInclude(sg => sg.Group)
            .Include(x => x.Payments)
                .ThenInclude(x => x.StudentAmounts);
    }

    public async Task<Student?> GetDetailsAsync(Guid studentId)
    {
        return await _context.Students
            .Include(x => x.StudentGroups)
                .ThenInclude(sg => sg.Group)
            .FirstOrDefaultAsync(x => x.Id == studentId);
    }

    public async Task<Student?> GetByIdWithGroupAsync(Guid studentId)
    {
        return await _context.Students
            .Include(x => x.StudentGroups)
                .ThenInclude(sg => sg.Group)
            .FirstOrDefaultAsync(x => x.Id == studentId);
    }

    #region Stats
    public async Task<int> GetTotalStudentsAsync()
    {
        return await _context.Students.CountAsync(s => !s.IsDeleted);
    }

    public async Task<int> GetActiveStudentsAsync()
    {
        return await _context.Students.CountAsync(s => s.IsActive && !s.IsDeleted);
    }

    public async Task<int> GetInactiveStudentsAsync()
    {
        return await _context.Students.CountAsync(s => !s.IsActive && !s.IsDeleted);
    }

    public async Task<int> GetNewStudentsThisMonthAsync()
    {
        var now = DateTime.UtcNow;

        return await _context.Students.CountAsync(s =>
            s.CreatedAt.Month == now.Month &&
            s.CreatedAt.Year == now.Year &&
            !s.IsDeleted);
    }

    public async Task<StudentStatsResult> GetStudentStatsAsync()
    {
        var now = DateTime.UtcNow;

        return await _context.Students
            .Where(s => !s.IsDeleted)
            .GroupBy(x => 1)
            .Select(g => new StudentStatsResult
            {
                TotalStudents = g.Count(),

                ActiveStudents = g.Count(x => x.IsActive),

                InactiveStudents = g.Count(x => !x.IsActive),

                NewStudentsThisMonth = g.Count(x =>
                    x.CreatedAt.Month == now.Month &&
                    x.CreatedAt.Year == now.Year)
            })
            .FirstOrDefaultAsync() ?? new StudentStatsResult();
    }
    #endregion
    #endregion

    public async Task<Student?> GetByFullNameAndGroupAsync(
         string fullName,
         Guid groupId,
         Guid? excludedStudentId = null)
    {
        return await _context.StudentGroups
            .Where(sg =>
                sg.GroupId == groupId &&
                sg.IsActive &&
                sg.LeftAt == null &&
                sg.Student.FullName == fullName &&
                (!excludedStudentId.HasValue || sg.StudentId != excludedStudentId.Value))
            .Select(sg => sg.Student)
            .FirstOrDefaultAsync();
    }

}

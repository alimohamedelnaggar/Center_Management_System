

using CenterManagement.Data.Enums;
using CenterManagement.Infrustructure.InfrastructureBases.Abstracts;

namespace CenterManagement.Infrustructure.Repositories;

public class AttendanceRepository : GenericRepository<Attendance>, IAttendanceRepository
{
    #region Fields
    private readonly AppDbContext dbContext;
    #endregion

    #region Constructors
    public AttendanceRepository(AppDbContext dbContext) : base(dbContext)
    {
        this.dbContext = dbContext;
    }
    #endregion

    #region Handle Functions

    #endregion
    public async Task<List<Attendance>> GetStudentAttendanceAsync(
    Guid studentId,
    CancellationToken cancellationToken = default)
    {
        return await dbContext.Attendances
            .AsNoTracking()
            .Where(x => x.StudentId == studentId)
            .Include(x => x.Session)
                .ThenInclude(x => x.Group)
            .OrderByDescending(x => x.AttendanceDate)
            .ToListAsync(cancellationToken);
    }

    public async Task<AttendanceStatsDTO> GetAttendanceStatsAsync(List<Guid>? groupIds = null)
    {
        var today = DateOnly.FromDateTime(DateTime.Today);
        var now = DateTime.Today;

        var attendances = dbContext.Attendances.AsNoTracking();

        // When the caller is restricted to a subset of groups (teacher scope),
        // only count attendance recorded for sessions in those groups.
        if (groupIds is not null)
            attendances = attendances.Where(x => groupIds.Contains(x.Session.GroupId));

        var presentToday = await attendances.CountAsync(x =>
            x.AttendanceDate == today &&
            x.Status == AttendanceStatus.Present);

        var absentToday = await attendances.CountAsync(x =>
            x.AttendanceDate == today &&
            x.Status == AttendanceStatus.Absent);

        var presentThisMonth = await attendances.CountAsync(x =>
            x.Status == AttendanceStatus.Present &&
            x.AttendanceDate.Month == now.Month &&
            x.AttendanceDate.Year == now.Year);

        var totalToday = presentToday + absentToday;

        return new AttendanceStatsDTO
        {
            PresentToday = presentToday,
            AbsentToday = absentToday,
            PresentThisMonth = presentThisMonth,
            AttendanceRate = totalToday == 0
                ? 0
                : Math.Round((double)presentToday / totalToday * 100, 1)
        };
    }
    public async Task<Attendance?> GetStudentAttendanceForSessionAsync(
    Guid studentId,
    Guid sessionId,
    DateOnly attendanceDate,
    CancellationToken cancellationToken = default)
    {
        return await dbContext.Attendances
            .AsNoTracking()
            .FirstOrDefaultAsync(
                x => x.StudentId == studentId &&
                     x.SessionId == sessionId &&
                     x.AttendanceDate == attendanceDate,
                cancellationToken);
    }
    public async Task<int> CountAttendedSessionsAsync(
    Guid studentId,
    Guid groupId,
    DateOnly billingPeriod,
    CancellationToken cancellationToken = default)
    {
        var start = new DateOnly(billingPeriod.Year, billingPeriod.Month, 1);
        var end = start.AddMonths(1);

        return await dbContext.Attendances
            .AsNoTracking()
            .Where(a =>
                a.StudentId == studentId &&
                a.Session.GroupId == groupId &&
                a.Status == AttendanceStatus.Present &&
                a.AttendanceDate >= start &&
                a.AttendanceDate < end)
            .CountAsync(cancellationToken);
    }
}

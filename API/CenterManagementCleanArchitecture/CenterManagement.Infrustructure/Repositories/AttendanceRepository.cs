

using CenterManagement.Data.Enums;
using CenterManagement.Data.Results;
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
        var monthStart = new DateOnly(today.Year, today.Month, 1);
        var monthEnd = monthStart.AddMonths(1);

        var attendances = dbContext.Attendances.AsNoTracking();

        // When the caller is restricted to a subset of groups (teacher scope),
        // only count attendance recorded for sessions in those groups.
        if (groupIds is not null)
            attendances = attendances.Where(x => groupIds.Contains(x.Session.GroupId));

        var todayStats = await attendances
            .Where(x => x.AttendanceDate == today)
            .GroupBy(_ => 1)
            .Select(g => new
            {
                Present = g.Count(x => x.Status == AttendanceStatus.Present),
                Absent = g.Count(x => x.Status == AttendanceStatus.Absent),
                Late = g.Count(x => x.Status == AttendanceStatus.Late),
                Excused = g.Count(x => x.Status == AttendanceStatus.Excused)
            })
            .FirstOrDefaultAsync();

        var monthStats = await attendances
            .Where(x => x.AttendanceDate >= monthStart && x.AttendanceDate < monthEnd)
            .GroupBy(_ => 1)
            .Select(g => new
            {
                Present = g.Count(x => x.Status == AttendanceStatus.Present),
                Absent = g.Count(x => x.Status == AttendanceStatus.Absent),
                Late = g.Count(x => x.Status == AttendanceStatus.Late),
                Excused = g.Count(x => x.Status == AttendanceStatus.Excused)
            })
            .FirstOrDefaultAsync();

        var presentToday = todayStats?.Present ?? 0;
        var absentToday = todayStats?.Absent ?? 0;
        var lateToday = todayStats?.Late ?? 0;
        var excusedToday = todayStats?.Excused ?? 0;
        var totalToday = presentToday + absentToday + lateToday + excusedToday;

        var presentThisMonth = monthStats?.Present ?? 0;
        var absentThisMonth = monthStats?.Absent ?? 0;
        var lateThisMonth = monthStats?.Late ?? 0;
        var excusedThisMonth = monthStats?.Excused ?? 0;
        var totalThisMonth = presentThisMonth + absentThisMonth + lateThisMonth + excusedThisMonth;

        return new AttendanceStatsDTO
        {
            PresentToday = presentToday,
            AbsentToday = absentToday,
            LateToday = lateToday,
            ExcusedToday = excusedToday,
            TotalToday = totalToday,
            PresentThisMonth = presentThisMonth,
            AbsentThisMonth = absentThisMonth,
            LateThisMonth = lateThisMonth,
            ExcusedThisMonth = excusedThisMonth,
            TotalThisMonth = totalThisMonth,
            AttendanceRate = AttendanceRateCalculator.Calculate(
                presentToday,
                lateToday,
                excusedToday,
                totalToday)
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

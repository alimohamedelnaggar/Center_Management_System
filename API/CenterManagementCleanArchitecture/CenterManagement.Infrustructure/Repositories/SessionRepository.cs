namespace CenterManagement.Infrustructure.Repositories;

public class SessionRepository : GenericRepository<Session>, ISessionRepository
{
    private readonly AppDbContext context;

    public SessionRepository(AppDbContext context) : base(context)
    {
        this.context = context;
    }
    public async Task<bool> HasTimeConflictAsync(Guid groupId, DayOfWeek dayOfWeek, TimeOnly startTime, TimeOnly endTime, Guid? excludeSessionId = null, CancellationToken cancellationToken = default)
    {
        return await context.Sessions
            .AnyAsync(s => s.GroupId == groupId && !s.IsDeleted && s.DayOfWeek == dayOfWeek && (!excludeSessionId.HasValue || s.Id != excludeSessionId.Value) && startTime < s.EndTime && endTime > s.StartTime, cancellationToken);
    }
    public async Task<bool> HasAttendanceAsync(Guid sessionId, CancellationToken cancellationToken = default)
    {
        return await context.Attendances
            .AnyAsync(x => x.SessionId == sessionId, cancellationToken);
    }
    public async Task<Session?> GetDetailsAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await context.Sessions
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted, cancellationToken);
    }
    public async Task<List<Session>> GetByGroupAsync(Guid groupId, CancellationToken cancellationToken = default)
    {
        return await context.Sessions
            .AsNoTracking()
            .Where(x => x.GroupId == groupId && !x.IsDeleted)
            .OrderBy(x => x.DayOfWeek)
            .ThenBy(x => x.StartTime)
            .ToListAsync(cancellationToken);
    }

    public async Task<Session?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await context.Sessions
   .FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted, cancellationToken);
    }
}

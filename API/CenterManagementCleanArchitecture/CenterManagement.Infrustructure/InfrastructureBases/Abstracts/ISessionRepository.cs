using CenterManagement.Infrustructure.InfrastructureBases.Bases;

public interface ISessionRepository : IGenericRepository<Session>
{
    Task<bool> HasTimeConflictAsync(
        Guid groupId,
        DayOfWeek dayOfWeek,
        TimeOnly startTime,
        TimeOnly endTime,
        Guid? excludeSessionId = null,
        CancellationToken cancellationToken = default);
    Task<bool> HasAttendanceAsync(
    Guid sessionId,
    CancellationToken cancellationToken = default);
    Task<Session?> GetDetailsAsync(
    Guid id,
    CancellationToken cancellationToken = default);
    Task<List<Session>> GetByGroupAsync(
    Guid groupId,
    CancellationToken cancellationToken = default);
    public Task<Session?> GetByIdAsync(Guid id,
    CancellationToken cancellationToken = default);

}
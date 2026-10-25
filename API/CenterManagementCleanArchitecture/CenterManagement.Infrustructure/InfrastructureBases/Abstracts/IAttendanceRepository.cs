using CenterManagement.Infrustructure.InfrastructureBases.Bases;

namespace CenterManagement.Infrustructure.InfrastructureBases.Abstracts;

public interface IAttendanceRepository : IGenericRepository<Attendance>
{
    Task<List<Attendance>> GetStudentAttendanceAsync(
    Guid studentId,
    CancellationToken cancellationToken = default);
    Task<AttendanceStatsDTO> GetAttendanceStatsAsync(List<Guid>? groupIds = null);

    Task<Attendance?> GetStudentAttendanceForSessionAsync(
    Guid studentId, 
    Guid sessionId,
    DateOnly attendanceDat,
    CancellationToken cancellationToken = default);

    Task<int> CountAttendedSessionsAsync(
    Guid studentId,
    Guid groupId,
    DateOnly billingPeriod,
    CancellationToken cancellationToken = default);

}

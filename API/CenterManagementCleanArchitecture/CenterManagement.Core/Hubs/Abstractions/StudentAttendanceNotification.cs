using CenterManagement.Core.Hubs;
using Microsoft.AspNetCore.SignalR;

namespace CenterManagement.Core.Hubs.Abstractions;

public interface IStudentAttendanceNotification
{
    /// <summary>
    /// Notifies the clients of one center that attendance rows were saved.
    /// The event is scoped to the center group, so other centers never see it.
    /// </summary>
    Task AttendanceSaved(
        Guid centerId,
        Guid sessionId,
        IEnumerable<StudentAttendenceDTO> attendances);
}
public class StudentAttendanceNotification
    : IStudentAttendanceNotification
{
    private readonly IHubContext<StudentAttandanceHub> _hubContext;

    public StudentAttendanceNotification(IHubContext<StudentAttandanceHub> hub)
    {
        _hubContext = hub;
    }
    public async Task AttendanceSaved(
        Guid centerId,
        Guid sessionId,
        IEnumerable<StudentAttendenceDTO> attendances)
    {
        // Without a center we cannot address a group: sending to everyone
        // would leak the student names and phone numbers of other centers.
        if (centerId == Guid.Empty)
            return;

        await _hubContext.Clients
            .Group(StudentAttandanceHub.CenterGroup(centerId))
            .SendAsync(
                "AttendanceSaved",
                new
                {
                    SessionId = sessionId,
                    Attendances = attendances
                });
    }
}

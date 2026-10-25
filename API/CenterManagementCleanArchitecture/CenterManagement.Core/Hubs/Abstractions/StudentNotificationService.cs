using CenterManagement.Core.Features.UsersFeature.Students.Queries.Results;
using Microsoft.AspNetCore.SignalR;
namespace CenterManagement.Core.Hubs.Abstractions;


public interface IStudentNotificationService
{
    Task StudentAddedAsync(StudentPagedDTO student);
    Task StudentUpdatedAsync(StudentPagedDTO student);
    Task StudentDeletedAsync(Guid studentId);
    Task StudentChangeStatusAsync(Guid studentId);
    Task StudentChangePaymentStatusAsync(Guid studentId);
}
public class StudentNotificationService
    : IStudentNotificationService
{
    private readonly IHubContext<StudentHub> _hub;

    public StudentNotificationService(IHubContext<StudentHub> hub)
    {
        _hub = hub;
    }

    public async Task StudentAddedAsync(StudentPagedDTO student)
    {
        await _hub.Clients.All.SendAsync("StudentAdded", student);
    }

    public async Task StudentUpdatedAsync(StudentPagedDTO student)
    {
        await _hub.Clients.All.SendAsync("StudentUpdated", student);
    }

    public async Task StudentChangePaymentStatusAsync(Guid studentId)
    {
        await _hub.Clients.All.SendAsync("StudentStatusChanged", studentId);
    }
    public async Task StudentDeletedAsync(Guid studentId)
    {
        await _hub.Clients.All.SendAsync("StudentDeletedChanged", studentId);
    }

    public async Task StudentChangeStatusAsync(Guid studentId)
    {
        await _hub.Clients.All.SendAsync("StudentStatusChanged", studentId);
    }
}
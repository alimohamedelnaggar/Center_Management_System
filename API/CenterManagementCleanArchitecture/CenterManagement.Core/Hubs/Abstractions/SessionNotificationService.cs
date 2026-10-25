using Microsoft.AspNetCore.SignalR;

namespace CenterManagement.Core.Hubs.Abstractions;

public interface ISessionNotificationService
{
    Task SessionAddedAsync(Guid sessionId);

    Task SessionUpdatedAsync(Guid sessionId);

    Task SessionDeletedAsync(Guid sessionId);
}
public class SessionNotificationService : ISessionNotificationService
{
    private readonly IHubContext<SessionHub> hubContext;

    public SessionNotificationService(IHubContext<SessionHub> hubContext)
    {
        this.hubContext = hubContext;
    }
    public async Task SessionAddedAsync(Guid sessionId)
    {
        await hubContext.Clients.All.SendAsync("SessionAdded", sessionId);
    }

    public async Task SessionUpdatedAsync(Guid sessionId)
    {
        await hubContext.Clients.All.SendAsync("SessionUpdated", sessionId);
    }

    public async Task SessionDeletedAsync(Guid sessionId)
    {
        await hubContext.Clients.All.SendAsync("SessionDeleted", sessionId);
    }
}
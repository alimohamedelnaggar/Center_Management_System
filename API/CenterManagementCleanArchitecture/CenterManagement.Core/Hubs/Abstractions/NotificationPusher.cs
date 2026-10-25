using CenterManagement.Core.Features.NotificationFeature.Dtos;
using Microsoft.AspNetCore.SignalR;

namespace CenterManagement.Core.Hubs.Abstractions;

public interface INotificationPusher
{
    Task PushAsync(IEnumerable<Guid> userIds, NotificationDTO notification);
}

public sealed class NotificationPusher : INotificationPusher
{
    private readonly IHubContext<NotificationHub> _hubContext;

    public NotificationPusher(IHubContext<NotificationHub> hubContext)
    {
        _hubContext = hubContext;
    }

    public async Task PushAsync(IEnumerable<Guid> userIds, NotificationDTO notification)
    {
        var ids = userIds
            .Where(id => id != Guid.Empty)
            .Distinct()
            .Select(id => id.ToString())
            .ToList();

        if (ids.Count == 0)
            return;

        await _hubContext.Clients
            .Users(ids)
            .SendAsync("NotificationReceived", notification);
    }
}

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace CenterManagement.Core.Hubs;

[Authorize]
public class NotificationHub : Hub
{
}

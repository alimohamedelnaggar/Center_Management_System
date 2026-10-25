

using Microsoft.AspNetCore.SignalR;

namespace CenterManagement.Core.Hubs.Abstractions
{
    public interface IGroupNotificationService
    {
        Task GroupAddedAsync(GetGroupsPaginationResponse group);
        Task GroupUpdatedAsync(GetGroupsPaginationResponse group);
        Task GroupDeletedAsync(Guid groupId); 
    }
    public class GroupNotificationService : IGroupNotificationService
    {
        private readonly IHubContext<GroupHub> _hub;

        public GroupNotificationService(IHubContext<GroupHub> hub)
        {
            _hub = hub;
        }

        public async Task GroupAddedAsync(GetGroupsPaginationResponse group)
        {
            await _hub.Clients.All.SendAsync("GroupAdded", group);
        }

        public async Task GroupUpdatedAsync(GetGroupsPaginationResponse group)
        {
            await _hub.Clients.All.SendAsync("GroupUpdated", group);
        }

        public async Task GroupDeletedAsync(Guid groupId)
        {
            await _hub.Clients.All.SendAsync("GroupDeleted", groupId);
        }
    }
}

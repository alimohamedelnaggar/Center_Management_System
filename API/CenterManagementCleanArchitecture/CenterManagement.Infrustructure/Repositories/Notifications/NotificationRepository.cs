using CenterManagement.Data.Entities.Notifications;
using CenterManagement.Infrustructure.InfrastructureBases.Abstracts.Notifications;

namespace CenterManagement.Infrustructure.Repositories.Notifications;

public class NotificationRepository :
    GenericRepository<Notification>, INotificationRepository
{
    public NotificationRepository(AppDbContext context) : base(context)
    {
    }
}

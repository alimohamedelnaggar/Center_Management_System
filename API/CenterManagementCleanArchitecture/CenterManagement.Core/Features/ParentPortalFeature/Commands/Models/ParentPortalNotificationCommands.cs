namespace CenterManagement.Core.Features.ParentPortalFeature.Commands.Models;

public class MarkParentNotificationReadCommand : IRequest<Response<string>>
{
    public Guid Id { get; set; }

    public MarkParentNotificationReadCommand(Guid id)
    {
        Id = id;
    }
}

public class MarkParentNotificationsReadAllCommand : IRequest<Response<string>>
{
}

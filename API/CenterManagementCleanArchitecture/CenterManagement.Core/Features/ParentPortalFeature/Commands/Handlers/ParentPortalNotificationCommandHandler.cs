using CenterManagement.Core.Features.Auth.CurrentUserFeature.Queries.Models;
using CenterManagement.Core.Features.ParentPortalFeature.Commands.Models;
using CenterManagement.Data.Entities.Notifications;

namespace CenterManagement.Core.Features.ParentPortalFeature.Commands.Handlers;

/// <summary>
/// Marks the signed-in parent's notifications as read. A notification can only
/// ever be touched while it still points at one of the parent's current
/// children, mirroring the read rules of the list.
/// </summary>
public class ParentPortalNotificationCommandHandler : ResponseHandler,
    IRequestHandler<MarkParentNotificationReadCommand, Response<string>>,
    IRequestHandler<MarkParentNotificationsReadAllCommand, Response<string>>
{
    private readonly AppDbContext _context;
    private readonly IMediator _mediator;

    public ParentPortalNotificationCommandHandler(
        AppDbContext context,
        IMediator mediator,
        IStringLocalizer<SharedResources> localizer)
        : base(localizer)
    {
        _context = context;
        _mediator = mediator;
    }

    public async Task<Response<string>> Handle(
        MarkParentNotificationReadCommand request,
        CancellationToken cancellationToken)
    {
        var userId = (await _mediator.Send(new GetUserIdQuery(), cancellationToken)).Data;

        var linkedStudentIds = await _context.ParentStudentLinks
            .Where(l => l.ParentUserId == userId)
            .Select(l => l.StudentId)
            .ToListAsync(cancellationToken);

        var notification = await _context.Notifications
            .FirstOrDefaultAsync(n =>
                n.Id == request.Id &&
                n.ParentUserId == userId &&
                n.StudentId != null &&
                linkedStudentIds.Contains(n.StudentId.Value),
                cancellationToken);

        if (notification is null)
            return NotFound<string>("الإشعار غير موجود");

        if (!notification.IsRead)
        {
            notification.IsRead = true;
            notification.ReadAt = DateTime.UtcNow;

            await _context.SaveChangesAsync(cancellationToken);
        }

        return Success<string>(null, "تم تعليم الإشعار كمقروء");
    }

    public async Task<Response<string>> Handle(
        MarkParentNotificationsReadAllCommand request,
        CancellationToken cancellationToken)
    {
        var userId = (await _mediator.Send(new GetUserIdQuery(), cancellationToken)).Data;

        var linkedStudentIds = await _context.ParentStudentLinks
            .Where(l => l.ParentUserId == userId)
            .Select(l => l.StudentId)
            .ToListAsync(cancellationToken);

        if (linkedStudentIds.Count == 0)
            return Success<string>(null, "تم تعليم كل الإشعارات كمقروءة");

        var notifications = await _context.Notifications
            .Where(n =>
                n.ParentUserId == userId &&
                !n.IsRead &&
                n.StudentId != null &&
                linkedStudentIds.Contains(n.StudentId.Value))
            .ToListAsync(cancellationToken);

        foreach (var notification in notifications)
        {
            notification.IsRead = true;
            notification.ReadAt = DateTime.UtcNow;
        }

        if (notifications.Count > 0)
            await _context.SaveChangesAsync(cancellationToken);

        return Success<string>(null, "تم تعليم كل الإشعارات كمقروءة");
    }
}

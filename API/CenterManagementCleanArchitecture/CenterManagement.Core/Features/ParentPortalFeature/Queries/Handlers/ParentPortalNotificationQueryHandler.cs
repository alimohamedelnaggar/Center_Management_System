using CenterManagement.Core.Features.Auth.CurrentUserFeature.Queries.Models;
using CenterManagement.Core.Features.NotificationFeature.Dtos;
using CenterManagement.Core.Features.ParentPortalFeature.Queries.Models;

namespace CenterManagement.Core.Features.ParentPortalFeature.Queries.Handlers;

/// <summary>
/// Reads the in-app notifications of the signed-in parent. The list is scoped to
/// the parent AND to the children he is linked to right now, so a stale
/// notification (or one that belongs to somebody else) can never be listed or
/// counted.
/// </summary>
public class ParentPortalNotificationQueryHandler : ResponseHandler,
    IRequestHandler<GetParentNotificationsQuery, Response<PaginatedResult<NotificationDTO>>>,
    IRequestHandler<GetParentUnreadNotificationsCountQuery, Response<int>>
{
    private readonly AppDbContext _context;
    private readonly IMediator _mediator;

    public ParentPortalNotificationQueryHandler(
        AppDbContext context,
        IMediator mediator,
        IStringLocalizer<SharedResources> localizer)
        : base(localizer)
    {
        _context = context;
        _mediator = mediator;
    }

    public async Task<Response<PaginatedResult<NotificationDTO>>> Handle(
        GetParentNotificationsQuery request,
        CancellationToken cancellationToken)
    {
        var userId = (await _mediator.Send(new GetUserIdQuery(), cancellationToken)).Data;

        var linkedStudentIds = await _context.ParentStudentLinks
            .Where(l => l.ParentUserId == userId)
            .Select(l => l.StudentId)
            .ToListAsync(cancellationToken);

        if (linkedStudentIds.Count == 0)
        {
            return Success(PaginatedResult<NotificationDTO>.Success(
                new List<NotificationDTO>(),
                0,
                request.PageNumber,
                request.PageSize));
        }

        var query = _context.Notifications
            .AsNoTracking()
            .Where(n =>
                n.ParentUserId == userId &&
                n.StudentId != null &&
                linkedStudentIds.Contains(n.StudentId.Value));

        var totalCount = await query.CountAsync(cancellationToken);

        var items = await query
            .OrderByDescending(n => n.CreatedAt)
            .Skip((request.PageNumber - 1) * request.PageSize)
            .Take(request.PageSize)
            .Select(n => new NotificationDTO
            {
                Id = n.Id,
                Title = n.Title,
                Body = n.Body,
                Type = n.Type,
                ReferenceId = n.ReferenceId,
                ReferenceType = n.ReferenceType,
                IsRead = n.IsRead,
                CreatedAt = n.CreatedAt,
                StudentId = n.StudentId
            })
            .ToListAsync(cancellationToken);

        return Success(PaginatedResult<NotificationDTO>.Success(
            items,
            totalCount,
            request.PageNumber,
            request.PageSize));
    }

    public async Task<Response<int>> Handle(
        GetParentUnreadNotificationsCountQuery request,
        CancellationToken cancellationToken)
    {
        var userId = (await _mediator.Send(new GetUserIdQuery(), cancellationToken)).Data;

        var linkedStudentIds = await _context.ParentStudentLinks
            .Where(l => l.ParentUserId == userId)
            .Select(l => l.StudentId)
            .ToListAsync(cancellationToken);

        if (linkedStudentIds.Count == 0)
            return Success(0);

        var count = await _context.Notifications
            .AsNoTracking()
            .CountAsync(n =>
                n.ParentUserId == userId &&
                !n.IsRead &&
                n.StudentId != null &&
                linkedStudentIds.Contains(n.StudentId.Value),
                cancellationToken);

        return Success(count);
    }
}

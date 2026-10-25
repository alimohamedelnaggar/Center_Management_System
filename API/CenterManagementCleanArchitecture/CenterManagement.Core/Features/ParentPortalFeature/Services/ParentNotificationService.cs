using CenterManagement.Core.Features.NotificationFeature.Dtos;
using CenterManagement.Data.Entities.Notifications;

namespace CenterManagement.Core.Features.ParentPortalFeature.Services;

/// <summary>
/// Canonical <c>Notification.Type</c> values written for the parent portal.
/// Kept as strings (like the student types) so the two portals never share a
/// key and the portal can style each event differently.
/// </summary>
public static class ParentNotificationTypes
{
    public const string Attendance = "ParentAttendance";
    public const string ExamResults = "ParentExamResults";
    public const string PaymentOverdue = "ParentPaymentOverdue";

    /// <summary>All parent rows carry a non-null StudentId.</summary>
    public static bool IsParentNotification(string? type) =>
        type is Attendance or ExamResults or PaymentOverdue;
}

/// <summary>
/// Writes in-app notifications for the parents of a single child.
///
/// Every row produced here obeys four rules the rest of the system relies on:
/// <list type="bullet">
/// <item>Only parents that are linked to the child right now are notified.</item>
/// <item>Nothing is written unless the center bought BOTH the parent portal and
/// the event's own module.</item>
/// <item>A row is identified by (parent, type, event identity); a second call
/// with the same identity is a no-op, so the hooks stay idempotent.</item>
/// <item>The message stays short and never carries a phone number or any other
/// personal identifier.</item>
/// </list>
/// The service throws on failure — callers are expected to isolate it so a
/// failed notification can never break the operation that triggered it.
/// </summary>
public interface IParentNotificationService
{
    /// <param name="studentId">The child the notification belongs to.</param>
    /// <param name="type">One of <see cref="ParentNotificationTypes"/>.</param>
    /// <param name="requiredModule">
    /// Module that must be enabled (besides the parent portal) for the child's
    /// center — attendance / online_exams / payments.
    /// </param>
    /// <param name="eventReferenceId">Stable id of the triggering event.</param>
    /// <param name="eventReferenceType">
    /// Stable event identity: everything that distinguishes "the same event
    /// happening again" from "a genuinely new event" (session + date + status,
    /// the billing period, ...).
    /// </param>
    Task NotifyStudentParentsAsync(
        Guid studentId,
        string type,
        string requiredModule,
        Guid? eventReferenceId,
        string eventReferenceType,
        string title,
        string body,
        CancellationToken cancellationToken = default);
}

public sealed class ParentNotificationService : IParentNotificationService
{
    private readonly AppDbContext _context;
    private readonly ICenterModuleService _moduleService;
    private readonly INotificationPusher _pusher;

    public ParentNotificationService(
        AppDbContext context,
        ICenterModuleService moduleService,
        INotificationPusher pusher)
    {
        _context = context;
        _moduleService = moduleService;
        _pusher = pusher;
    }

    public async Task NotifyStudentParentsAsync(
        Guid studentId,
        string type,
        string requiredModule,
        Guid? eventReferenceId,
        string eventReferenceType,
        string title,
        string body,
        CancellationToken cancellationToken = default)
    {
        var centerId = await _context.Students
            .Where(x => x.Id == studentId)
            .Select(x => (Guid?)x.CenterId)
            .FirstOrDefaultAsync(cancellationToken);

        // A student without a center behaves exactly like a locked-off module
        // check with nothing to gate against: the portal reads it as "enabled".
        if (centerId is not null)
        {
            var portalEnabled = await _moduleService.IsEnabledAsync(
                centerId.Value, ModuleKeys.ParentPortal, cancellationToken);

            if (!portalEnabled)
                return;

            var eventEnabled = await _moduleService.IsEnabledAsync(
                centerId.Value, requiredModule, cancellationToken);

            if (!eventEnabled)
                return;
        }

        // Only parents linked right now — an unlinked (or removed) parent never
        // hears about the child again.
        var parentIds = await _context.ParentStudentLinks
            .Where(l => l.StudentId == studentId)
            .Select(l => l.ParentUserId)
            .Distinct()
            .ToListAsync(cancellationToken);

        if (parentIds.Count == 0)
            return;

        // Idempotency: same (parent, type, event identity) => already written.
        var notified = await _context.Notifications
            .Where(n =>
                n.ParentUserId != null &&
                parentIds.Contains(n.ParentUserId.Value) &&
                n.Type == type &&
                n.ReferenceType == eventReferenceType &&
                n.ReferenceId == eventReferenceId)
            .Select(n => n.ParentUserId!.Value)
            .ToListAsync(cancellationToken);

        var pending = parentIds.Where(id => !notified.Contains(id)).ToList();

        if (pending.Count == 0)
            return;

        var rows = pending.Select(parentId => new Notification
        {
            // The parent portal reads ParentUserId; UserId stays null so a
            // student account can never surface this row.
            UserId = null,
            ParentUserId = parentId,
            StudentId = studentId,
            Title = title,
            Body = body,
            Type = type,
            ReferenceId = eventReferenceId,
            ReferenceType = eventReferenceType,
            CenterId = centerId,
            IsRead = false,
            CreatedAt = DateTime.UtcNow
        }).ToList();

        _context.Notifications.AddRange(rows);
        await _context.SaveChangesAsync(cancellationToken);

        await _pusher.PushAsync(pending, new NotificationDTO
        {
            Title = title,
            Body = body,
            Type = type,
            ReferenceId = eventReferenceId,
            ReferenceType = eventReferenceType,
            IsRead = false,
            CreatedAt = DateTime.UtcNow
        });
    }
}

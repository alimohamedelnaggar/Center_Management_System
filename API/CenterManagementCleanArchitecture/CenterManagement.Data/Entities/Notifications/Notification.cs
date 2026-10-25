namespace CenterManagement.Data.Entities.Notifications;

public class Notification : BaseEntity, ITenantEntity
{
    // Recipient identity user id. Set for student notifications only; a parent
    // notification instead carries ParentUserId (below), so the two portals can
    // never read each other's rows.
    public Guid? UserId { get; set; }

    // Recipient parent identity user id. Null for every student notification.
    // The parent portal filters on this column and the deduplication index is
    // built on top of it.
    public Guid? ParentUserId { get; set; }

    // Child this notification points at (always the linked Student id for
    // parent notifications). Drives "open the child page" in the portal.
    public Guid? StudentId { get; set; }

    public string Title { get; set; } = default!;
    public string? Body { get; set; }

    // Logical type, e.g. "QuestionExamCreated".
    public string Type { get; set; } = default!;

    public Guid? ReferenceId { get; set; }
    public string? ReferenceType { get; set; }

    public bool IsRead { get; set; }
    public DateTime? ReadAt { get; set; }

    public Guid? CenterId { get; set; }
}

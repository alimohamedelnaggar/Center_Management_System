using CenterManagement.Data.Entities.Notifications;

namespace CenterManagement.Infrustructure.Data.Configurations.Notifications;

public sealed class NotificationConfiguration : IEntityTypeConfiguration<Notification>
{
    public void Configure(EntityTypeBuilder<Notification> builder)
    {
        builder.ToTable("Notifications");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.Title)
            .HasMaxLength(200)
            .IsRequired();

        builder.Property(x => x.Body)
            .HasMaxLength(1000);

        builder.Property(x => x.Type)
            .HasMaxLength(100)
            .IsRequired();

        builder.Property(x => x.ReferenceType)
            .HasMaxLength(100);

        builder.HasIndex(x => new { x.UserId, x.IsRead });

        // Parent-portal reads: every unread badge / list query for a parent is
        // filtered on (ParentUserId, IsRead).
        builder.HasIndex(x => new { x.ParentUserId, x.IsRead });

        // Child linkage used by "only show notifications of my current links".
        builder.HasIndex(x => new { x.ParentUserId, x.StudentId });

        // One notification per (parent, event type, event identity). This is what
        // makes both the synchronous hooks and the daily overdue job idempotent —
        // re-saving the same attendance status or re-running the job can never
        // duplicate a row. Student rows are untouched (ParentUserId is NULL, and
        // NULLs are distinct in a unique index on both SQL Server and SQLite).
        builder.HasIndex(x => new { x.ParentUserId, x.Type, x.ReferenceType, x.ReferenceId })
            .IsUnique()
            .HasDatabaseName("UX_Notifications_Parent_Dedup");
    }
}

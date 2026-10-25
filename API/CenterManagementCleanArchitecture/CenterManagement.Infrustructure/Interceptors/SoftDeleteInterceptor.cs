using CenterManagement.Data.Entities.SoftDelete;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;

namespace CenterManagement.Infrustructure.Interceptors;

public class SoftDeleteInterceptor : SaveChangesInterceptor
{
    public override InterceptionResult<int> SavingChanges(
        DbContextEventData eventData,
        InterceptionResult<int> result)
    {
        ApplySoftDelete(eventData.Context);

        return base.SavingChanges(eventData, result);
    }

    public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
        DbContextEventData eventData,
        InterceptionResult<int> result,
        CancellationToken cancellationToken = default)
    {
        ApplySoftDelete(eventData.Context);

        return base.SavingChangesAsync(
            eventData,
            result,
            cancellationToken);
    }

    private static void ApplySoftDelete(DbContext? context)
    {
        if (context == null)
            return;

        var now = DateTime.UtcNow;

        foreach (var entry in context.ChangeTracker.Entries<ISoftDelete>())
        {
            if (entry.State == EntityState.Deleted)
            {
                entry.State = EntityState.Modified;

                entry.Entity.IsDeleted = true;

                entry.Entity.DeletedAt ??= now;
            }
            else if (entry.State == EntityState.Modified &&
                     !entry.Entity.DeletedAt.HasValue)
            {
                // Becomes deleted only when IsDeleted changed
                // from false -> true during this save.
                var isDeletedProperty =
                    entry.Property(nameof(ISoftDelete.IsDeleted));

                var originalIsDeleted = isDeletedProperty.IsModified
                    ? (bool)(isDeletedProperty.OriginalValue ?? false)
                    : entry.Entity.IsDeleted;

                if (entry.Entity.IsDeleted && !originalIsDeleted)
                    entry.Entity.DeletedAt = now;
            }
        }
    }
}
using CenterManagement.Data.Entities;
using CenterManagement.Data.Entities.Abstractions;
using CenterManagement.Data.Entities.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;

namespace CenterManagement.Infrustructure.Interceptors;

/// <summary>
/// Automatically stamps <see cref="ITenantEntity.CenterId"/> on newly added
/// entities of the current center so callers don't have to.
/// </summary>
public class TenantInterceptor : SaveChangesInterceptor
{
    private readonly ITenantContext _tenantContext;

    public TenantInterceptor(ITenantContext tenantContext)
    {
        _tenantContext = tenantContext;
    }

    public override InterceptionResult<int> SavingChanges(
        DbContextEventData eventData,
        InterceptionResult<int> result)
    {
        ApplyTenant(eventData.Context);

        return base.SavingChanges(eventData, result);
    }

    public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
        DbContextEventData eventData,
        InterceptionResult<int> result,
        CancellationToken cancellationToken = default)
    {
        ApplyTenant(eventData.Context);

        return base.SavingChangesAsync(eventData, result, cancellationToken);
    }

    private void ApplyTenant(DbContext? context)
    {
        if (context == null)
            return;

        var centerId = _tenantContext.CenterId;

        foreach (var entry in context.ChangeTracker.Entries<ITenantEntity>())
        {
            if (entry.State == EntityState.Added && entry.Entity.CenterId == null && centerId.HasValue)
            {
                entry.Entity.CenterId = centerId;
            }

            // User-derived tenant entities (e.g. Assistent) hide User.CenterId with
            // their own property, so mirror the value onto the Identity row. The
            // CenterId claim is built from User.CenterId at sign-in time.
            if (entry.State == EntityState.Added &&
                entry.Entity is User user &&
                user.CenterId == null &&
                centerId.HasValue)
            {
                user.CenterId = centerId;
            }
        }
    }
}

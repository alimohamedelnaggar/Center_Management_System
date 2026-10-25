using CenterManagement.Data.Entities;
using CenterManagement.Data.Entities.Abstractions;
using CenterManagement.Data.Enums;
using CenterManagement.Data.Results;
using CenterManagement.Infrustructure.Data;
using Microsoft.EntityFrameworkCore;

namespace CenterManagement.Infrustructure.Services;

/// <summary>
/// Default <see cref="IAccountAccessService"/>. The center's subscription state
/// is derived on demand (see <see cref="CenterSubscriptionEvaluator"/>) rather
/// than persisted, so no scheduled job is required. A center stays usable during
/// its grace window (past the end date but within <see cref="Center.GraceDays"/>).
/// </summary>
public sealed class AccountAccessService : IAccountAccessService
{
    private readonly AppDbContext _context;
    private readonly TimeProvider _timeProvider;

    public AccountAccessService(AppDbContext context, TimeProvider timeProvider)
    {
        _context = context;
        _timeProvider = timeProvider;
    }

    public async Task<AccountAccessResult> CheckAsync(
        Guid userId,
        CancellationToken cancellationToken = default)
    {
        var user = await _context.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);

        if (user is null)
            return new AccountAccessResult(
                AccountAccessStatus.UserDeleted,
                AccountAccessCodes.UserDeleted,
                "هذا الحساب غير موجود، لا يمكنك الدخول.");

        if (user.IsDeleted)
            return new AccountAccessResult(
                AccountAccessStatus.UserDeleted,
                AccountAccessCodes.UserDeleted,
                "تم حذف هذا الحساب، لا يمكنك الدخول.");

        if (!user.IsActive)
            return new AccountAccessResult(
                AccountAccessStatus.UserInactive,
                AccountAccessCodes.UserInactive,
                "هذا الحساب غير مُفعّل حالياً، تواصل مع الدعم.");

        // Platform operators (SuperAdmin, ...) are not tied to a center and are
        // therefore never blocked.
        if (user.CenterId is null)
            return AccountAccessResult.Ok();

        var center = await _context.Centers
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(c => c.Id == user.CenterId, cancellationToken);

        if (center is null || center.IsDeleted)
            return new AccountAccessResult(
                AccountAccessStatus.CenterDeleted,
                AccountAccessCodes.CenterDeleted,
                "تم حذف المركز الخاص بك، لا يمكنك الدخول.");

        if (!center.IsActive)
            return new AccountAccessResult(
                AccountAccessStatus.CenterInactive,
                AccountAccessCodes.CenterInactive,
                "المركز غير مُفعّل حالياً، تواصل مع الدعم.");

        var effectiveStatus = ResolveEffectiveStatus(center);

        if (effectiveStatus != center.Status)
        {
            // Lazy transition to Expired so the change is reflected everywhere
            // without a background job.
            center.Status = effectiveStatus;
            center.UpdatedAt = _timeProvider.GetUtcNow().UtcDateTime;
            await _context.SaveChangesAsync(cancellationToken);
        }

        return effectiveStatus switch
        {
            CenterStatus.Suspended => new AccountAccessResult(
                AccountAccessStatus.CenterSuspended,
                AccountAccessCodes.CenterSuspended,
                "تم إيقاف المركز مؤقتاً، تواصل مع الدعم."),
            CenterStatus.Expired => new AccountAccessResult(
                AccountAccessStatus.CenterExpired,
                AccountAccessCodes.CenterExpired,
                "انتهى اشتراك المركز، يرجى تجديد الاشتراك للمتابعة."),
            _ => AccountAccessResult.Ok()
        };
    }

    public async Task<SubscriptionInfoDto?> GetSubscriptionAsync(
        Guid centerId,
        CancellationToken cancellationToken = default)
    {
        var center = await _context.Centers
            .IgnoreQueryFilters()
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == centerId, cancellationToken);

        if (center is null)
            return null;

        var info = CenterSubscriptionEvaluator.Evaluate(center, _timeProvider.GetUtcNow().UtcDateTime);

        return new SubscriptionInfoDto(
            info.State.ToString(),
            info.EndDate,
            info.DaysLeftInGrace,
            info.StartDate,
            info.Plan,
            info.DaysUntilEnd);
    }

    /// <summary>
    /// An Active center whose subscription has ended is treated as Expired only
    /// once its grace window has elapsed; a Suspended center stays suspended.
    /// </summary>
    public CenterStatus ResolveEffectiveStatus(Center center)
    {
        var info = CenterSubscriptionEvaluator.Evaluate(center, _timeProvider.GetUtcNow().UtcDateTime);

        return info.State switch
        {
            CenterSubscriptionState.Suspended => CenterStatus.Suspended,
            CenterSubscriptionState.Expired => CenterStatus.Expired,
            _ => CenterStatus.Active
        };
    }
}

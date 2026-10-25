using CenterManagement.Data.Entities;
using CenterManagement.Data.Enums;

namespace CenterManagement.Data.Results;

/// <summary>Derived lifecycle state of a center's subscription.</summary>
public enum CenterSubscriptionState
{
    /// <summary>Within its subscription period (or Lifetime).</summary>
    Active = 1,

    /// <summary>Past the end date but still inside the grace window.</summary>
    InGrace = 2,

    /// <summary>Past the end date and past the grace window.</summary>
    Expired = 3,

    /// <summary>Manually suspended by the platform (no grace applies).</summary>
    Suspended = 4
}

/// <summary>Derived subscription information exposed to the client.</summary>
public sealed record CenterSubscriptionInfo(
    CenterSubscriptionState State,
    DateTime? EndDate,
    int DaysLeftInGrace)
{
    /// <summary>Subscription start date (null when unknown).</summary>
    public DateTime? StartDate { get; init; }

    /// <summary>Plan label stored on the center (e.g. "Annual", "Lifetime").</summary>
    public string? Plan { get; init; }

    /// <summary>Whole days until the end date (negative once past it). Null for Lifetime.</summary>
    public int? DaysUntilEnd { get; init; }

    /// <summary>Whether the center may keep using the system in this state.</summary>
    public bool AllowsAccess =>
        State is CenterSubscriptionState.Active or CenterSubscriptionState.InGrace;
}

/// <summary>
/// Pure, testable evaluation of a center's subscription state from its
/// <see cref="Center.Status"/>, <see cref="Center.SubscriptionEnd"/> and
/// <see cref="Center.GraceDays"/>, compared by UTC date. Nothing is persisted;
/// the state is derived on demand.
/// </summary>
public static class CenterSubscriptionEvaluator
{
    public static CenterSubscriptionInfo Evaluate(Center center, DateTime utcNow)
    {
        var info = EvaluateCore(center, utcNow);

        var today = utcNow.Date;
        int? daysUntilEnd = center.SubscriptionEnd is null
            ? null
            : (center.SubscriptionEnd.Value.Date - today).Days;

        return info with
        {
            StartDate = center.SubscriptionStart,
            Plan = center.Plan,
            DaysUntilEnd = daysUntilEnd
        };
    }

    private static CenterSubscriptionInfo EvaluateCore(Center center, DateTime utcNow)
    {
        // A manually suspended center is suspended regardless of dates.
        if (center.Status == CenterStatus.Suspended)
            return new CenterSubscriptionInfo(
                CenterSubscriptionState.Suspended, center.SubscriptionEnd, 0);

        // Lifetime (no end date) is always active.
        if (center.SubscriptionEnd is null)
            return new CenterSubscriptionInfo(
                CenterSubscriptionState.Active, null, 0);

        var today = utcNow.Date;
        var endDate = center.SubscriptionEnd.Value.Date;

        if (today <= endDate)
            return new CenterSubscriptionInfo(
                CenterSubscriptionState.Active, center.SubscriptionEnd, 0);

        var grace = Math.Max(0, center.GraceDays);
        var graceEnd = endDate.AddDays(grace);

        if (today <= graceEnd)
            return new CenterSubscriptionInfo(
                CenterSubscriptionState.InGrace,
                center.SubscriptionEnd,
                (graceEnd - today).Days);

        return new CenterSubscriptionInfo(
            CenterSubscriptionState.Expired, center.SubscriptionEnd, 0);
    }
}

using CenterManagement.Data.Entities;
using CenterManagement.Data.Enums;
using CenterManagement.Data.Results;

namespace CenterManagement.Tests;

/// <summary>
/// Pure, deterministic tests for <see cref="CenterSubscriptionEvaluator"/>.
/// Time is passed explicitly, so these cover the exact UTC-date boundaries
/// (last day of grace vs. the next day) without touching the wall clock.
/// </summary>
public sealed class CenterSubscriptionEvaluatorTests
{
    private static readonly DateTime Now = new(2026, 8, 15, 10, 30, 0, DateTimeKind.Utc);

    private static Center Center(DateTime? end, int graceDays, CenterStatus status = CenterStatus.Active) =>
        new()
        {
            Id = Guid.NewGuid(),
            Status = status,
            SubscriptionEnd = end,
            GraceDays = graceDays
        };

    [Fact]
    public void Before_EndDate_Is_Active()
    {
        var info = CenterSubscriptionEvaluator.Evaluate(Center(Now.AddDays(5), 3), Now);

        Assert.Equal(CenterSubscriptionState.Active, info.State);
        Assert.True(info.AllowsAccess);
        Assert.Equal(0, info.DaysLeftInGrace);
    }

    [Fact]
    public void On_EndDate_Is_Active()
    {
        var info = CenterSubscriptionEvaluator.Evaluate(Center(Now, 3), Now);

        Assert.Equal(CenterSubscriptionState.Active, info.State);
        Assert.True(info.AllowsAccess);
    }

    [Fact]
    public void Last_Day_Of_Grace_Is_InGrace_And_Allowed()
    {
        // end = today - 3, grace = 3 -> grace ends today: still inside grace.
        var info = CenterSubscriptionEvaluator.Evaluate(Center(Now.AddDays(-3), 3), Now);

        Assert.Equal(CenterSubscriptionState.InGrace, info.State);
        Assert.True(info.AllowsAccess);
        Assert.Equal(0, info.DaysLeftInGrace);
    }

    [Fact]
    public void Day_After_Grace_Is_Expired_And_Blocked()
    {
        // end = today - 4, grace = 3 -> grace ended yesterday: expired.
        var info = CenterSubscriptionEvaluator.Evaluate(Center(Now.AddDays(-4), 3), Now);

        Assert.Equal(CenterSubscriptionState.Expired, info.State);
        Assert.False(info.AllowsAccess);
        Assert.Equal(0, info.DaysLeftInGrace);
    }

    [Fact]
    public void GraceDays_Zero_Expires_Immediately_After_EndDate()
    {
        var info = CenterSubscriptionEvaluator.Evaluate(Center(Now.AddDays(-1), 0), Now);

        Assert.Equal(CenterSubscriptionState.Expired, info.State);
        Assert.False(info.AllowsAccess);
    }

    [Fact]
    public void Lifetime_NullEndDate_Is_Always_Active()
    {
        var info = CenterSubscriptionEvaluator.Evaluate(Center(null, 3), Now);

        Assert.Equal(CenterSubscriptionState.Active, info.State);
        Assert.True(info.AllowsAccess);
    }

    [Fact]
    public void Suspended_During_Grace_Is_Blocked_Immediately()
    {
        // Within grace window, but manually suspended -> no grace applies.
        var info = CenterSubscriptionEvaluator.Evaluate(
            Center(Now.AddDays(-1), 3, CenterStatus.Suspended), Now);

        Assert.Equal(CenterSubscriptionState.Suspended, info.State);
        Assert.False(info.AllowsAccess);
    }

    [Fact]
    public void Comparison_Uses_Utc_Date_Only()
    {
        // Same UTC date, different time-of-day -> still Active (date comparison).
        var end = new DateTime(2026, 8, 15, 0, 0, 0, DateTimeKind.Utc);
        var lateNow = new DateTime(2026, 8, 15, 23, 59, 59, DateTimeKind.Utc);

        var info = CenterSubscriptionEvaluator.Evaluate(Center(end, 3), lateNow);

        Assert.Equal(CenterSubscriptionState.Active, info.State);
    }
}

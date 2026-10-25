using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace CenterManagement.Tests;

/// <summary>
/// A <see cref="TimeProvider"/> whose "now" can be moved from a test, so grace
/// and expiry behaviour can be exercised deterministically without waiting.
/// </summary>
public sealed class MutableTimeProvider : TimeProvider
{
    private DateTimeOffset _now;

    public MutableTimeProvider(DateTimeOffset now) => _now = now;

    public void SetUtcNow(DateTimeOffset now) => _now = now;

    public void Advance(TimeSpan delta) => _now = _now.Add(delta);

    public override DateTimeOffset GetUtcNow() => _now;
}

/// <summary>
/// Boots the real API but with a controllable clock, so the derived
/// subscription state (Active / InGrace / Expired / Suspended) can be asserted
/// at exact UTC-date boundaries.
/// </summary>
public sealed class TimeControlledApiFactory : ScopeApiFactory
{
    public MutableTimeProvider Clock { get; } =
        new(new DateTimeOffset(2026, 8, 15, 9, 0, 0, TimeSpan.Zero));

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        base.ConfigureWebHost(builder);

        builder.ConfigureTestServices(services =>
        {
            services.RemoveAll<TimeProvider>();
            services.AddSingleton<TimeProvider>(Clock);
        });
    }
}

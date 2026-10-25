namespace CenterManagement.Data.Entities.Abstractions;

/// <summary>
/// Resolves which feature modules are enabled for a center, backed by the
/// <c>CenterModules</c> table (the source of truth). A missing row for an
/// optional module means the module is disabled. Results are cached briefly
/// per process; call <see cref="Invalidate"/> after a module change.
/// </summary>
public interface ICenterModuleService
{
    /// <summary>Enabled module keys for the center (never contains "core").</summary>
    Task<IReadOnlySet<string>> GetEnabledModulesAsync(
        Guid centerId,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// True when the module is enabled for the center. "core" is always enabled;
    /// every center-scoped request also treats unknown/empty keys as enabled.
    /// </summary>
    Task<bool> IsEnabledAsync(
        Guid centerId,
        string moduleKey,
        CancellationToken cancellationToken = default);

    /// <summary>Evicts the cached module set for the center (call on change).</summary>
    void Invalidate(Guid centerId);
}

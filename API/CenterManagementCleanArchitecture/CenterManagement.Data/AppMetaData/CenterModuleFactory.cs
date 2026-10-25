using CenterManagement.Data.Entities.Subscriptions;

namespace CenterManagement.Data.AppMetaData;

/// <summary>
/// Builds the <see cref="CenterModule"/> rows that must exist for a center.
/// A missing row is treated as DISABLED, so every center-creation path has to
/// provision a full set (the "كامل" preset) to keep all features on by default.
/// SuperAdmin can then toggle individual modules afterwards.
/// </summary>
public static class CenterModuleFactory
{
    /// <summary>Creates the full set (all toggleable modules enabled) for a new center.</summary>
    public static List<CenterModule> CreateFullSet(Guid centerId) =>
        CreateSet(centerId, ModuleKeys.All);

    /// <summary>Creates enabled rows for the given module keys (unknown/duplicate/core keys are ignored).</summary>
    public static List<CenterModule> CreateSet(Guid centerId, IEnumerable<string> keys) =>
        keys.Where(key => !string.IsNullOrWhiteSpace(key))
            .Where(ModuleKeys.IsKnown)
            .Where(key => !string.Equals(key, ModuleKeys.Core, StringComparison.OrdinalIgnoreCase))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .Select(key => new CenterModule
            {
                CenterId = centerId,
                ModuleKey = key,
                IsEnabled = true
            })
            .ToList();
}

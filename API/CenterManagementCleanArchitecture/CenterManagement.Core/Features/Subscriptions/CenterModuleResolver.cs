using CenterManagement.Data.AppMetaData;

namespace CenterManagement.Core.Features.Subscriptions;

/// <summary>Outcome of proposing a module set for a center.</summary>
public sealed class ModuleResolution
{
    /// <summary>Final effective enabled set (after auto-enable and forced disable).</summary>
    public HashSet<string> Enabled { get; init; } = new(StringComparer.OrdinalIgnoreCase);

    /// <summary>The modules the caller explicitly asked to enable.</summary>
    public List<string> Requested { get; init; } = [];

    /// <summary>Modules pulled in automatically because an enabled module requires them.</summary>
    public HashSet<string> AutoEnabled { get; init; } = new(StringComparer.OrdinalIgnoreCase);

    /// <summary>Dependents turned off too so a required module could be disabled.</summary>
    public HashSet<string> ForceDisabled { get; init; } = new(StringComparer.OrdinalIgnoreCase);

    /// <summary>Disable attempts blocked by still-enabled dependents.</summary>
    public IReadOnlyList<ModuleConflict> Conflicts { get; init; } = [];

    public bool Blocked => Conflicts.Count > 0;
}

/// <summary>
/// Pure resolution of a proposed module set against the current one. Shared by the
/// preview query (so the UI can show "will auto-enable: ..." before saving) and the
/// update command (so the same rules are enforced on write).
/// </summary>
public static class CenterModuleResolver
{
    public static ModuleResolution Resolve(
        IEnumerable<string> requestedModules,
        IEnumerable<string> currentlyEnabled,
        bool disableDependents)
    {
        var requested = Normalize(requestedModules);
        var current = Normalize(currentlyEnabled);

        var conflicts = ModuleCatalog.FindDisableConflicts(requested, current);

        // A disable is blocked unless the caller opts in to disabling dependents.
        if (conflicts.Count > 0 && !disableDependents)
        {
            return new ModuleResolution
            {
                Requested = requested.ToList(),
                Enabled = current,
                Conflicts = conflicts
            };
        }

        var effective = new HashSet<string>(requested, StringComparer.OrdinalIgnoreCase);
        var forceDisabled = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        if (conflicts.Count > 0)
        {
            var queue = new Queue<string>();

            foreach (var dependent in conflicts.SelectMany(c => c.Dependents))
                if (forceDisabled.Add(dependent))
                    queue.Enqueue(dependent);

            while (queue.Count > 0)
            {
                var module = queue.Dequeue();

                foreach (var dependent in ModuleCatalog.Dependents(module))
                    if (effective.Contains(dependent) && forceDisabled.Add(dependent))
                        queue.Enqueue(dependent);
            }

            foreach (var module in forceDisabled)
                effective.Remove(module);
        }

        var enabled = ModuleCatalog.ClosureToEnable(effective);

        return new ModuleResolution
        {
            Requested = requested.ToList(),
            Enabled = enabled,
            AutoEnabled = new HashSet<string>(
                enabled.Except(effective, StringComparer.OrdinalIgnoreCase), StringComparer.OrdinalIgnoreCase),
            ForceDisabled = forceDisabled
        };
    }

    private static HashSet<string> Normalize(IEnumerable<string> keys) =>
        new(keys.Where(key => !string.IsNullOrWhiteSpace(key))
                .Where(ModuleKeys.IsKnown)
                .Where(key => !string.Equals(key, ModuleKeys.Core, StringComparison.OrdinalIgnoreCase))
                .Distinct(StringComparer.OrdinalIgnoreCase),
            StringComparer.OrdinalIgnoreCase);
}

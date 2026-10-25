namespace CenterManagement.Data.AppMetaData;

/// <summary>
/// Metadata the SuperAdmin subscription screen needs: Arabic display names and
/// the dependency graph between feature modules. The graph is used to (a) preview
/// which modules will be auto-enabled when a dependent module is switched on and
/// (b) warn before disabling a module other enabled modules still need.
/// </summary>
public static class ModuleCatalog
{
    /// <summary>Arabic labels shown in the module checkboxes.</summary>
    public static readonly IReadOnlyDictionary<string, string> DisplayNames =
        new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            [ModuleKeys.Attendance] = "الحضور والغياب",
            [ModuleKeys.Grades] = "الدرجات",
            [ModuleKeys.QuestionBank] = "بنك الأسئلة",
            [ModuleKeys.OnlineExams] = "الاختبارات الإلكترونية",
            [ModuleKeys.StudyNotes] = "المذكرات",
            [ModuleKeys.Payments] = "المدفوعات",
            [ModuleKeys.Accounting] = "الحسابات والمصروفات",
            [ModuleKeys.CenterReports] = "تقارير المركز",
            [ModuleKeys.Whatsapp] = "إشعارات واتساب",
            [ModuleKeys.StudentPortal] = "بوابة الطالب",
            [ModuleKeys.ParentPortal] = "بوابة ولي الأمر"
        };

    /// <summary>
    /// Direct prerequisites: enabling the key requires these modules to be on too.
    /// Auto-enabling is transitive (see <see cref="ClosureToEnable"/>).
    /// </summary>
    private static readonly IReadOnlyDictionary<string, string[]> Requirements =
        new Dictionary<string, string[]>(StringComparer.OrdinalIgnoreCase)
        {
            [ModuleKeys.OnlineExams] = [ModuleKeys.QuestionBank],
            [ModuleKeys.ParentPortal] = [ModuleKeys.Attendance, ModuleKeys.Payments]
        };

    public static string DisplayName(string key) =>
        DisplayNames.TryGetValue(key, out var name) ? name : key;

    /// <summary>Modules that <paramref name="key"/> directly requires.</summary>
    public static IReadOnlyList<string> Requires(string key) =>
        Requirements.TryGetValue(key, out var deps) ? deps : [];

    /// <summary>Modules that directly require <paramref name="key"/>.</summary>
    public static IReadOnlyList<string> Dependents(string key) =>
        Requirements.Where(pair => pair.Value.Contains(key, StringComparer.OrdinalIgnoreCase))
            .Select(pair => pair.Key)
            .ToArray();

    /// <summary>
    /// The full set that must be enabled to turn on <paramref name="requested"/>:
    /// the requested modules plus every transitive prerequisite.
    /// </summary>
    public static HashSet<string> ClosureToEnable(IEnumerable<string> requested)
    {
        var enabled = new HashSet<string>(
            requested.Where(ModuleKeys.IsKnown)
                .Where(k => !string.Equals(k, ModuleKeys.Core, StringComparison.OrdinalIgnoreCase)),
            StringComparer.OrdinalIgnoreCase);

        var queue = new Queue<string>(enabled);

        while (queue.Count > 0)
        {
            var current = queue.Dequeue();

            foreach (var dependency in Requires(current))
            {
                if (enabled.Add(dependency))
                    queue.Enqueue(dependency);
            }
        }

        return enabled;
    }

    /// <summary>
    /// For each module the caller wants to turn off, the still-enabled modules
    /// that depend on it (i.e. would be left broken). Empty when there is no
    /// conflict.
    /// </summary>
    public static IReadOnlyList<ModuleConflict> FindDisableConflicts(
        IEnumerable<string> requestedEnabled,
        IEnumerable<string> currentlyEnabled)
    {
        var requested = new HashSet<string>(
            requestedEnabled.Where(ModuleKeys.IsKnown), StringComparer.OrdinalIgnoreCase);

        var conflicts = new List<ModuleConflict>();

        foreach (var module in currentlyEnabled.Distinct(StringComparer.OrdinalIgnoreCase))
        {
            // Still enabled => not being disabled.
            if (requested.Contains(module))
                continue;

            var blocking = Dependents(module).Where(requested.Contains).ToArray();

            if (blocking.Length > 0)
                conflicts.Add(new ModuleConflict(module, blocking));
        }

        return conflicts;
    }
}

/// <summary>A module being disabled while other enabled modules still require it.</summary>
public sealed record ModuleConflict(string Module, string[] Dependents);

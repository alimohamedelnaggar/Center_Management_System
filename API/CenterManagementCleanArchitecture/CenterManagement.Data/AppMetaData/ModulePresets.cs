namespace CenterManagement.Data.AppMetaData;

/// <summary>
/// A named preset that pre-fills the module checkboxes in the SuperAdmin UI.
/// Presets are display/label hints only; <c>CenterModules</c> remains the source of truth.
/// </summary>
public sealed record ModulePreset(string Key, string Name, string PlanLabel, string[] Modules);

/// <summary>Built-in module presets ("حضور فقط", "متوسط", "كامل").</summary>
public static class ModulePresets
{
    public static readonly ModulePreset AttendanceOnly = new(
        Key: "attendance_only",
        Name: "حضور فقط",
        PlanLabel: "حضور فقط",
        Modules:
        [
            ModuleKeys.Attendance
        ]);

    public static readonly ModulePreset Medium = new(
        Key: "medium",
        Name: "متوسط",
        PlanLabel: "متوسط",
        Modules:
        [
            ModuleKeys.Attendance,
            ModuleKeys.Grades,
            ModuleKeys.QuestionBank,
            ModuleKeys.StudyNotes,
            ModuleKeys.Payments,
            ModuleKeys.Accounting,
            ModuleKeys.CenterReports,
            ModuleKeys.StudentPortal
        ]);

    public static readonly ModulePreset Full = new(
        Key: "full",
        Name: "كامل",
        PlanLabel: "كامل",
        Modules: ModuleKeys.All);

    public static readonly ModulePreset[] All = [AttendanceOnly, Medium, Full];

    public static ModulePreset? ByKey(string key) =>
        All.FirstOrDefault(p => string.Equals(p.Key, key, StringComparison.OrdinalIgnoreCase));
}

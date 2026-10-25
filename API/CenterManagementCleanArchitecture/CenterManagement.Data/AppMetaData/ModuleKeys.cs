namespace CenterManagement.Data.AppMetaData;

/// <summary>
/// Canonical keys for the per-center feature modules. Stored on
/// <c>CenterModules.ModuleKey</c> and used by <c>RequireModule</c> policies.
/// </summary>
public static class ModuleKeys
{
    /// <summary>Always-on baseline (auth, users, groups, sessions, profile, dashboard). Never toggled.</summary>
    public const string Core = "core";

    public const string Attendance = "attendance";
    public const string Grades = "grades";
    public const string QuestionBank = "question_bank";
    public const string OnlineExams = "online_exams";
    public const string StudyNotes = "study_notes";
    public const string Payments = "payments";
    public const string Accounting = "accounting";
    public const string CenterReports = "center_reports";
    public const string Whatsapp = "whatsapp";
    public const string StudentPortal = "student_portal";
    public const string ParentPortal = "parent_portal";

    /// <summary>All toggleable modules (excludes <see cref="Core"/>). Used for the full backfill.</summary>
    public static readonly string[] All =
    [
        Attendance,
        Grades,
        QuestionBank,
        OnlineExams,
        StudyNotes,
        Payments,
        Accounting,
        CenterReports,
        Whatsapp,
        StudentPortal,
        ParentPortal
    ];

    public static bool IsKnown(string key) =>
        key == Core || Array.IndexOf(All, key) >= 0;
}

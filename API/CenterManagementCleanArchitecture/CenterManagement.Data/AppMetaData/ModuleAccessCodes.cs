namespace CenterManagement.Data.AppMetaData;

/// <summary>
/// Machine-readable codes returned when a request targets a feature that is not
/// enabled for the caller's center, so the UI can react distinctly.
/// </summary>
public static class ModuleAccessCodes
{
    public const string ModuleDisabled = "MODULE_DISABLED";

    public const string ModuleDisabledMessage = "هذه الميزة غير مفعّلة في اشتراكك";
}

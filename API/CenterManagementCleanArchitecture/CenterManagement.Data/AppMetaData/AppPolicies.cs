namespace CenterManagement.Data.AppMetaData;

public static class AppPolicies
{
    public const string PlatformAdmin = "PlatformAdmin";
    public const string CenterAdmin = "CenterAdmin";
    public const string Operational = "Operational";
    public const string CenterAdminAssistant = "CenterAdminAssistant";
    public const string CenterAdminAcademic = "CenterAdminAcademic";
    public const string CenterAdminTeacher = "CenterAdminTeacher";

    public const string IsCenterAdminClaim = "is_center_admin";
    public const string TrueValue = "true";

    /// <summary>Set on the access token while a temporary password must be changed.</summary>
    public const string PasswordChangeRequiredClaim = "pwd_change_required";

    /// <summary>Error code returned by the API when the forced change is pending.</summary>
    public const string PasswordChangeRequiredCode = "PASSWORD_CHANGE_REQUIRED";
}

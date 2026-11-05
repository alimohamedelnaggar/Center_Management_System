using System.ComponentModel.DataAnnotations;
using System.Text.RegularExpressions;
using CenterManagement.Data.AppMetaData;

namespace CenterManagement.Core.Helpers;

/// <summary>
/// Shared rules for the public password-recovery flow. Recovery is only offered
/// to staff accounts that actually own a confirmed email address; students and
/// parents are told to contact their center. The response wording never reveals
/// whether an identifier belongs to an account.
/// </summary>
public static class AccountRecoveryHelper
{
    /// <summary>
    /// The one response every send-code request receives, for a known account,
    /// an unknown identifier, a student account, or an account without email.
    /// </summary>
    public const string SendCodeMessage =
        "لو الحساب مرتبط ببريد إلكتروني، سيصلك كود. وإلا تواصل مع المركز.";

    public const string ResetFailedMessage = "الرمز غير صحيح أو منتهي الصلاحية.";

    private static readonly Regex EgyptianPhone =
        new(@"^01[0125][0-9]{8}$", RegexOptions.Compiled);

    /// <summary>
    /// Roles allowed to recover their own password. A solo teacher is a
    /// <see cref="AppRoles.Teacher"/> who owns the center, so this list covers it.
    /// </summary>
    private static readonly HashSet<string> RecoverableRoles = new(StringComparer.OrdinalIgnoreCase)
    {
        AppRoles.SuperAdmin,
        AppRoles.CenterOwner,
        AppRoles.Teacher,
        AppRoles.Assistant
    };

    /// <summary>Normalizes an email-or-phone identifier without changing a phone.</summary>
    public static string Normalize(string? identifier)
    {
        var trimmed = identifier?.Trim() ?? string.Empty;
        return trimmed.Contains('@') ? trimmed.ToLowerInvariant() : trimmed;
    }

    public static bool IsEmail(string? identifier)
        => Normalize(identifier).Contains('@');

    /// <summary>
    /// The identifier to look the account up by. <c>Identifier</c> is the new
    /// contract; <c>PhoneNumber</c> remains accepted for older clients.
    /// </summary>
    public static string EffectiveIdentifier(string? identifier, string? phoneNumber)
        => Normalize(string.IsNullOrWhiteSpace(identifier) ? phoneNumber : identifier);

    public static bool IsValid(string? identifier)
    {
        var normalized = Normalize(identifier);

        if (string.IsNullOrEmpty(normalized))
            return false;

        return IsEmail(normalized)
            ? new EmailAddressAttribute().IsValid(normalized)
            : EgyptianPhone.IsMatch(normalized);
    }

    public static bool CanRecover(IEnumerable<string> roles)
        => roles.Any(role => RecoverableRoles.Contains(role));

    /// <summary>
    /// An account can receive a recovery code only when it has a confirmed email
    /// and belongs to a staff role. Students, parents and email-less accounts
    /// silently receive the same generic response.
    /// </summary>
    public static bool CanReceiveCode(IEnumerable<string> roles, string? email, bool emailConfirmed)
        => !string.IsNullOrWhiteSpace(email)
           && emailConfirmed
           && CanRecover(roles);
}

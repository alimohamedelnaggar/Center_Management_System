namespace CenterManagement.Core.Helpers;

using System.ComponentModel.DataAnnotations;

/// <summary>
/// Shared rules for the optional email address on staff accounts. Emails are
/// trimmed and lower-cased before they are stored, and the friendly duplicate
/// message never mentions the account that already owns the address.
/// </summary>
public static class UserEmailHelper
{
    public const string DuplicateMessage = "هذا البريد الإلكتروني مستخدم بالفعل.";
    public const string InvalidMessage = "البريد الإلكتروني غير صحيح.";

    /// <summary>
    /// Returns <c>null</c> for an omitted/blank address, otherwise the trimmed,
    /// lower-cased address that is safe to compare and store.
    /// </summary>
    public static string? Normalize(string? email)
        => string.IsNullOrWhiteSpace(email) ? null : email.Trim().ToLowerInvariant();

    /// <summary>
    /// True when the address is omitted or is a valid address once trimmed. The
    /// validators use this so surrounding whitespace is ignored instead of
    /// turning an otherwise valid address into a 400.
    /// </summary>
    public static bool IsValidOptional(string? email)
    {
        var normalized = Normalize(email);

        return normalized is null || new EmailAddressAttribute().IsValid(normalized);
    }

    /// <summary>
    /// Writes the address and marks it confirmed. Used for every email an admin
    /// enters on behalf of another account: the admin vouches for it, so the
    /// account holder is not asked to confirm it again.
    /// </summary>
    public static void ApplyConfirmed(User user, string? email)
        => Apply(user, Normalize(email), confirmed: true);

    public static void Apply(User user, string? normalizedEmail, bool confirmed)
    {
        user.Email = normalizedEmail;
        user.NormalizedEmail = normalizedEmail?.ToUpperInvariant();
        user.EmailConfirmed = normalizedEmail is not null && confirmed;

        // An admin edit supersedes any self-service change that was still
        // waiting for confirmation. Keeping the staged value would let a stale
        // link from before the edit overwrite the address the admin just set.
        user.PendingEmail = null;
        user.PendingEmailRequestedAt = null;
    }

    public static bool IsDuplicateEmail(IdentityResult result)
        => result.Errors.Any(error =>
            string.Equals(error.Code, "DuplicateEmail", StringComparison.OrdinalIgnoreCase));

    /// <summary>
    /// The filtered unique index is the last line of defence for two concurrent
    /// requests. Provider messages name either the index or the normalized
    /// column, so both are treated as a duplicate rather than leaking the raw
    /// database error (which would contain the address).
    /// </summary>
    public static bool IsDuplicateEmail(Exception? exception)
    {
        for (var current = exception; current is not null; current = current.InnerException)
        {
            if (current.Message.Contains("NormalizedEmail", StringComparison.OrdinalIgnoreCase)
                || current.Message.Contains("EmailIndex", StringComparison.OrdinalIgnoreCase))
            {
                return true;
            }
        }

        return false;
    }
}

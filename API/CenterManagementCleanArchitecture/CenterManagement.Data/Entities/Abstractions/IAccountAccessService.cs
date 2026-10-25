namespace CenterManagement.Data.Entities.Abstractions;

/// <summary>
/// Outcome of the account/tenant access check applied at sign-in, on token
/// refresh and on every authenticated request.
/// </summary>
public enum AccountAccessStatus
{
    Allowed = 0,
    UserInactive = 1,
    UserDeleted = 2,
    CenterDeleted = 3,
    CenterInactive = 4,
    CenterSuspended = 5,
    CenterExpired = 6
}

/// <summary>
/// Machine-readable access codes returned to the client so the UI can show a
/// distinct Arabic message per situation.
/// </summary>
public static class AccountAccessCodes
{
    public const string UserInactive = "USER_INACTIVE";
    public const string UserDeleted = "USER_DELETED";
    public const string CenterDeleted = "CENTER_DELETED";
    public const string CenterInactive = "CENTER_INACTIVE";
    public const string CenterSuspended = "CENTER_SUSPENDED";
    public const string CenterExpired = "CENTER_EXPIRED";
}

public sealed record AccountAccessResult(
    AccountAccessStatus Status,
    string Code,
    string Message)
{
    public bool Allowed => Status == AccountAccessStatus.Allowed;

    public static AccountAccessResult Ok() =>
        new(AccountAccessStatus.Allowed, string.Empty, string.Empty);
}

/// <summary>
/// Centralises the rules that decide whether a user may currently use the
/// system: the account is active and not deleted, and (when the user belongs to
/// a center) the center is active, not deleted and not suspended/expired.
/// SuperAdmin and platform users with no center are never blocked.
/// </summary>
public interface IAccountAccessService
{
    Task<AccountAccessResult> CheckAsync(Guid userId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Derived subscription snapshot for a center, or null when the center does
    /// not exist. Used to expose the state on sign-in / refresh / profile.
    /// </summary>
    Task<CenterManagement.Data.Results.SubscriptionInfoDto?> GetSubscriptionAsync(
        Guid centerId,
        CancellationToken cancellationToken = default);
}

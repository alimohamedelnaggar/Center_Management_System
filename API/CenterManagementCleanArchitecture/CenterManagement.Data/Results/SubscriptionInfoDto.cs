namespace CenterManagement.Data.Results;

/// <summary>
/// Client-facing snapshot of a center's subscription state, exposed on sign-in,
/// token refresh and the current-user/profile endpoints so the UI can show the
/// right state (active, in grace, expired) without an extra round-trip.
/// </summary>
public sealed record SubscriptionInfoDto(
    string State,
    DateTime? EndDate,
    int DaysLeftInGrace,
    DateTime? StartDate = null,
    string? Type = null,
    int? DaysUntilEnd = null);

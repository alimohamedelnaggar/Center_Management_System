using CenterManagement.Core.Bases;
using CenterManagement.Data.AppMetaData;
using CenterManagement.Data.Enums;
using MediatR;

namespace CenterManagement.Core.Features.Centers.Commands.Models;

/// <summary>
/// Onboards a new tenant by creating the login account together with its
/// center. The account is either a <c>CenterOwner</c> (a center that can create
/// teachers) or a <c>Teacher</c> (a single-teacher center). Used by the
/// SuperAdmin.
/// </summary>
public class OnboardCenterOwnerCommand : IRequest<Response<OnboardCenterOwnerResult>>
{
    /// <summary>Either <see cref="AppRoles.CenterOwner"/> or
    /// <see cref="AppRoles.Teacher"/>.</summary>
    public string AccountType { get; set; } = AppRoles.CenterOwner;

    // ---- Login account ----
    public string OwnerFullName { get; set; } = default!;
    public string OwnerPhone { get; set; } = default!;

    /// <summary>
    /// Initial password for the account. Leave empty to let the platform
    /// generate a temporary password. In both cases the user is forced to
    /// choose a new password on first sign-in.
    /// </summary>
    public string? OwnerPassword { get; set; }

    /// <summary>Subject of a single-teacher account. Required when
    /// <see cref="AccountType"/> is <see cref="AppRoles.Teacher"/>.</summary>
    public string? Subject { get; set; }

    // ---- Center ----
    public string CenterName { get; set; } = default!;
    public string? CenterPhone { get; set; }
    public string? CenterAddress { get; set; }
    public string? CenterDescription { get; set; }
    public string? ThemeColor { get; set; }

    // ---- Optional initial subscription (SuperAdmin create form) ----
    // When omitted the center is created with no subscription window and every
    // module enabled (the historical, backward-compatible behaviour).
    public SubscriptionPlanType? SubscriptionType { get; set; }
    public DateTime? SubscriptionStart { get; set; }

    /// <summary>Explicit end date. Ignored for <see cref="SubscriptionPlanType.Lifetime"/>
    /// and computed from the type when omitted.</summary>
    public DateTime? SubscriptionEnd { get; set; }

    public decimal? Price { get; set; }
    public decimal? PaidAmount { get; set; }
    public string? Currency { get; set; }
    public int? GraceDays { get; set; }
    public string? Plan { get; set; }
    public string? SubscriptionNotes { get; set; }

    /// <summary>Feature modules to enable. When omitted/empty every module is
    /// enabled (backward-compatible default). Prerequisites are auto-enabled.</summary>
    public List<string>? EnabledModules { get; set; }
}

public class OnboardCenterOwnerResult
{
    public Guid CenterId { get; set; }
    public Guid OwnerId { get; set; }
    public string OwnerPhone { get; set; } = default!;
    public string AccountType { get; set; } = default!;

    /// <summary>The password to hand to the account holder. They must change it
    /// on first sign-in.</summary>
    public string InitialPassword { get; set; } = default!;

    public bool MustChangePassword { get; set; } = true;
}

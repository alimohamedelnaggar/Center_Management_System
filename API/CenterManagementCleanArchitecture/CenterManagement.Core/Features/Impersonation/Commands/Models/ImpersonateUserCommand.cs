using CenterManagement.Core.Bases;
using MediatR;

namespace CenterManagement.Core.Features.Impersonation.Commands.Models;

/// <summary>
/// Claim names emitted on an impersonation access token so the UI can show the
/// banner and the audit trail can link back to the operator.
/// </summary>
public static class ImpersonationClaims
{
    public const string ImpersonatedBy = "impersonated_by";
    public const string IsImpersonation = "impersonation";
    public const string TrueValue = "true";
}

/// <summary>Start impersonating another (non SuperAdmin) user. SuperAdmin only.</summary>
public class ImpersonateUserCommand : IRequest<Response<ImpersonationResult>>
{
    public Guid UserId { get; set; }
}

public class ImpersonationResult
{
    public string AccessToken { get; set; } = default!;
    public Guid UserId { get; set; }
    public string FullName { get; set; } = default!;
    public string? PhoneNumber { get; set; }
    public string? Role { get; set; }
    public Guid ImpersonatedBy { get; set; }
    public DateTime ExpiresAt { get; set; }

    /// <summary>Access code (e.g. CENTER_SUSPENDED) when the target's center is
    /// not usable, so the banner can explain why the data is limited.</summary>
    public string? CenterStatusCode { get; set; }

    /// <summary>Arabic message describing the blocked center/user, if any.</summary>
    public string? CenterWarning { get; set; }
}

/// <summary>End the current impersonation session. Returns a fresh SuperAdmin
/// token so the operator can keep working.</summary>
public class StopImpersonationCommand : IRequest<Response<StopImpersonationResult>>
{
}

public class StopImpersonationResult
{
    public string? AccessToken { get; set; }
    public Guid? SuperAdminId { get; set; }
}

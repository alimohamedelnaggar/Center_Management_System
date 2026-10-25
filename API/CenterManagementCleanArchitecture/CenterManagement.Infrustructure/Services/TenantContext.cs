using CenterManagement.Data.AppMetaData;
using CenterManagement.Data.AppMetaData;
using CenterManagement.Data.Entities;
using CenterManagement.Data.Entities.Abstractions;
using Microsoft.AspNetCore.Http;
using System.Security.Claims;

namespace CenterManagement.Infrustructure.Services;

/// <summary>
/// Resolves the current tenant (center) from the JWT claims of the active
/// request. The <c>CenterId</c> claim is emitted at sign-in time.
/// </summary>
public sealed class TenantContext : ITenantContext
{
    public const string CenterIdClaimType = TenantClaimTypes.CenterId;

    private const string SuperAdminRole = "SuperAdmin";

    private readonly IHttpContextAccessor _httpContextAccessor;

    public TenantContext(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    private ClaimsPrincipal? Principal => _httpContextAccessor.HttpContext?.User;

    public Guid? UserId
    {
        get
        {
            var value = Principal?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return Guid.TryParse(value, out var id) ? id : null;
        }
    }

    public Guid? CenterId
    {
        get
        {
            var value = Principal?.FindFirst(CenterIdClaimType)?.Value;
            return Guid.TryParse(value, out var id) ? id : null;
        }
    }

    public string? Role
    {
        get
        {
            var roles = Roles;
            return roles.Count > 0 ? roles[0] : null;
        }
    }

    private IReadOnlyList<string> Roles =>
        Principal?.FindAll(ClaimTypes.Role).Select(c => c.Value).ToList()
        ?? (IReadOnlyList<string>)Array.Empty<string>();

    public bool IsCenterAdmin =>
        Principal?.HasClaim(AppPolicies.IsCenterAdminClaim, AppPolicies.TrueValue) == true;

    public bool IsUnrestricted
    {
        get
        {
            var roles = Roles;

            // Unauthenticated / system calls (e.g. sign-in) are unrestricted.
            if (Principal?.Identity?.IsAuthenticated != true || roles.Count == 0)
                return true;

            return roles.Contains(SuperAdminRole);
        }
    }
}

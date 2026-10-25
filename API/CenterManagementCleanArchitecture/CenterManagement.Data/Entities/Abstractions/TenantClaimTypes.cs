namespace CenterManagement.Data.Entities.Abstractions;

/// <summary>
/// Custom claim types used to carry tenant (center) information in the JWT.
/// </summary>
public static class TenantClaimTypes
{
    public const string CenterId = "CenterId";
}

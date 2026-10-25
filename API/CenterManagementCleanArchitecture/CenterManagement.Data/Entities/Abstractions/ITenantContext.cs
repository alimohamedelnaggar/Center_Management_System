namespace CenterManagement.Data.Entities.Abstractions;

/// <summary>
/// Exposes the tenant (center) of the current request so that the
/// <c>AppDbContext</c> global query filters and the tenant interceptor can
/// isolate data between centers.
/// </summary>
public interface ITenantContext
{
    /// <summary>Id of the authenticated user, if any.</summary>
    Guid? UserId { get; }

    /// <summary>Center of the authenticated user, if any.</summary>
    Guid? CenterId { get; }

    /// <summary>Primary role of the authenticated user, if any.</summary>
    string? Role { get; }

    /// <summary>
    /// True when the authenticated user administers the center as a whole
    /// (CenterOwner or a solo teacher with the <c>is_center_admin</c> claim).
    /// Such users are not narrowed to a subset of groups.
    /// </summary>
    bool IsCenterAdmin { get; }

    /// <summary>
    /// True for roles that are not bound to a single center (Admin, SuperAdmin)
    /// or for system/unauthenticated requests. When true no tenant filter is applied.
    /// </summary>
    bool IsUnrestricted { get; }
}

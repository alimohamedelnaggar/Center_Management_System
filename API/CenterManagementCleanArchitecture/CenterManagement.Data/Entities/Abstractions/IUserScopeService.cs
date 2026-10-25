namespace CenterManagement.Data.Entities.Abstractions;

/// <summary>
/// Describes how the current user's access to data inside their center is
/// narrowed. A <see cref="CenterWide"/> scope grants access to every group of
/// the center; otherwise access is limited to the listed group ids.
/// </summary>
public sealed class UserScope
{
    public static readonly UserScope Full = new(true, new List<Guid>());

    public UserScope(bool centerWide, List<Guid> groupIds)
    {
        CenterWide = centerWide;
        GroupIds = groupIds;
    }

    /// <summary>When true the user may see every group of their center.</summary>
    public bool CenterWide { get; }

    /// <summary>Ids of the groups the user is limited to (ignored when <see cref="CenterWide"/>).</summary>
    public List<Guid> GroupIds { get; }

    /// <summary>True when access is limited to a subset of groups.</summary>
    public bool IsRestricted => !CenterWide;

    /// <summary>Returns true when the given group is inside the user's scope.</summary>
    public bool Allows(Guid groupId) => CenterWide || GroupIds.Contains(groupId);
}

/// <summary>
/// Resolves the data scope of the current request (center wide, a teacher's own
/// groups, or an assistant linked to a single teacher).
/// </summary>
public interface IUserScopeService
{
    Task<UserScope> ResolveAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Returns true when the given student is inside the user's scope (a member
    /// of one of the user's groups). Center-wide scopes allow every student.
    /// </summary>
    Task<bool> AllowsStudentAsync(Guid studentId, CancellationToken cancellationToken = default);
}

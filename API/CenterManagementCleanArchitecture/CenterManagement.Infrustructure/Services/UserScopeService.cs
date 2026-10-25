using CenterManagement.Data.AppMetaData;
using CenterManagement.Data.Entities.Abstractions;
using CenterManagement.Data.Entities.Users;
using CenterManagement.Infrustructure.Data;
using Microsoft.EntityFrameworkCore;

namespace CenterManagement.Infrustructure.Services;

/// <summary>
/// Resolves the per-request data scope from the JWT claims and the user's
/// group assignments:
/// <list type="bullet">
/// <item>SuperAdmin / CenterOwner / solo teacher â†’ whole center.</item>
/// <item>Teacher â†’ only the groups assigned to him.</item>
/// <item>Assistant linked to a teacher â†’ that teacher's groups; otherwise whole center.</item>
/// </list>
/// </summary>
public sealed class UserScopeService : IUserScopeService
{
    private readonly AppDbContext _context;
    private readonly ITenantContext _tenantContext;

    public UserScopeService(AppDbContext context, ITenantContext tenantContext)
    {
        _context = context;
        _tenantContext = tenantContext;
    }

    public async Task<UserScope> ResolveAsync(CancellationToken cancellationToken = default)
    {
        // SuperAdmin or unauthenticated/system calls are not narrowed.
        if (_tenantContext.IsUnrestricted || _tenantContext.CenterId is null)
            return UserScope.Full;

        // CenterOwner / solo teacher administer the whole center.
        if (_tenantContext.Role == AppRoles.CenterOwner || _tenantContext.IsCenterAdmin)
            return UserScope.Full;

        if (_tenantContext.Role == AppRoles.Teacher && _tenantContext.UserId is Guid teacherId)
            return await ResolveTeacherScopeAsync(teacherId, cancellationToken);

        if (_tenantContext.Role == AppRoles.Assistant && _tenantContext.UserId is Guid assistantId)
            return await ResolveAssistantScopeAsync(assistantId, cancellationToken);

        // Students / unknown roles have no group-level scope; they are still
        // isolated to their center by the global query filters.
        return UserScope.Full;
    }

    public async Task<bool> AllowsStudentAsync(
        Guid studentId,
        CancellationToken cancellationToken = default)
    {
        var scope = await ResolveAsync(cancellationToken);
        if (scope.CenterWide)
            return true;

        return await _context.Students
            .AnyAsync(s => s.Id == studentId
                && s.StudentGroups.Any(sg =>
                    scope.GroupIds.Contains(sg.GroupId)
                    && sg.IsActive
                    && sg.LeftAt == null), cancellationToken);
    }

    private async Task<UserScope> ResolveTeacherScopeAsync(
        Guid teacherId,
        CancellationToken cancellationToken)
    {
        var groupIds = await _context.TeacherGroups
            .Where(tg => tg.TeacherId == teacherId)
            .Select(tg => tg.GroupId)
            .Distinct()
            .ToListAsync(cancellationToken);

        return new UserScope(false, groupIds);
    }

    private async Task<UserScope> ResolveAssistantScopeAsync(
        Guid assistantId,
        CancellationToken cancellationToken)
    {
        var teacherId = await _context.Assistents
            .Where(a => a.Id == assistantId)
            .Select(a => a.TeacherId)
            .FirstOrDefaultAsync(cancellationToken);

        if (teacherId is Guid linkedTeacherId)
            return await ResolveTeacherScopeAsync(linkedTeacherId, cancellationToken);

        return UserScope.Full;
    }
}


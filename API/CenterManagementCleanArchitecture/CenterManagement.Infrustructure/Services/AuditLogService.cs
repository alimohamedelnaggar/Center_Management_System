using CenterManagement.Data.Entities.Abstractions;
using CenterManagement.Data.Entities.Audit;
using Microsoft.AspNetCore.Http;

namespace CenterManagement.Infrustructure.Services;

/// <summary>
/// Persists <see cref="AuditLog"/> rows. The actor defaults to the caller of the
/// current request; callers such as impersonation can override it explicitly.
/// </summary>
public sealed class AuditLogService : IAuditLogService
{
    private readonly AppDbContext _context;
    private readonly ITenantContext _tenantContext;
    private readonly IHttpContextAccessor _httpContextAccessor;

    public AuditLogService(
        AppDbContext context,
        ITenantContext tenantContext,
        IHttpContextAccessor httpContextAccessor)
    {
        _context = context;
        _tenantContext = tenantContext;
        _httpContextAccessor = httpContextAccessor;
    }

    public async Task WriteAsync(
        string action,
        string? entityType = null,
        string? entityId = null,
        string? details = null,
        Guid? actorUserId = null,
        CancellationToken cancellationToken = default)
    {
        var entry = new AuditLog
        {
            Action = action,
            EntityType = entityType,
            EntityId = entityId,
            Details = details,
            ActorUserId = actorUserId ?? _tenantContext.UserId,
            IpAddress = _httpContextAccessor.HttpContext?.Connection?.RemoteIpAddress?.ToString(),
            CreatedAt = DateTime.UtcNow
        };

        _context.AuditLogs.Add(entry);
        await _context.SaveChangesAsync(cancellationToken);
    }
}

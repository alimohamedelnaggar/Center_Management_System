namespace CenterManagement.Data.Entities.Abstractions;

/// <summary>
/// Append-only audit trail for privileged platform operations (center
/// onboarding, impersonation, password resets, ...). Implementations resolve the
/// acting user and client IP from the current request unless overridden.
/// </summary>
public interface IAuditLogService
{
    Task WriteAsync(
        string action,
        string? entityType = null,
        string? entityId = null,
        string? details = null,
        Guid? actorUserId = null,
        CancellationToken cancellationToken = default);
}

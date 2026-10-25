using CenterManagement.Core.Bases;
using CenterManagement.Core.Wrappers;
using MediatR;

namespace CenterManagement.Core.Features.Audit.Queries.Models;

/// <summary>Paginated platform audit trail (SuperAdmin only).</summary>
public class GetAuditLogsQuery : IRequest<Response<PaginatedResult<AuditLogDto>>>
{
    public int PageNumber { get; set; } = 1;

    public int PageSize { get; set; } = 20;

    /// <summary>Optional free-text match against the action, entity or details.</summary>
    public string? Search { get; set; }

    /// <summary>Optional exact action filter (e.g. "Impersonate").</summary>
    public string? Action { get; set; }
}

public class AuditLogDto
{
    public Guid Id { get; set; }

    public Guid? ActorUserId { get; set; }

    public string? ActorName { get; set; }

    public string Action { get; set; } = default!;

    public string? EntityType { get; set; }

    public string? EntityId { get; set; }

    public string? Details { get; set; }

    public string? IpAddress { get; set; }

    public DateTime CreatedAt { get; set; }
}

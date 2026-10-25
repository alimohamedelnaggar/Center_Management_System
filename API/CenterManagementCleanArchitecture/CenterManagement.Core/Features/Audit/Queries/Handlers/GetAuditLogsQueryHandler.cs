using CenterManagement.Core.Features.Audit.Queries.Models;
using CenterManagement.Core.Wrappers;
using CenterManagement.Infrustructure.Data;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Localization;

namespace CenterManagement.Core.Features.Audit.Queries.Handlers;

public class GetAuditLogsQueryHandler
    : ResponseHandler, IRequestHandler<GetAuditLogsQuery, Response<PaginatedResult<AuditLogDto>>>
{
    private readonly AppDbContext _context;

    public GetAuditLogsQueryHandler(
        IStringLocalizer<SharedResources> localizer,
        AppDbContext context) : base(localizer)
    {
        _context = context;
    }

    public async Task<Response<PaginatedResult<AuditLogDto>>> Handle(
        GetAuditLogsQuery request,
        CancellationToken cancellationToken)
    {
        var pageNumber = request.PageNumber <= 0 ? 1 : request.PageNumber;
        var pageSize = request.PageSize <= 0 ? 20 : request.PageSize;

        var query = _context.AuditLogs.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(request.Action))
        {
            var action = request.Action.Trim();
            query = query.Where(log => log.Action == action);
        }

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var search = request.Search.Trim();
            query = query.Where(log =>
                log.Action.Contains(search) ||
                (log.EntityType != null && log.EntityType.Contains(search)) ||
                (log.Details != null && log.Details.Contains(search)));
        }

        var totalCount = await query.CountAsync(cancellationToken);

        var rows = await query
            .OrderByDescending(log => log.CreatedAt)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .Select(log => new
            {
                log.Id,
                log.ActorUserId,
                log.Action,
                log.EntityType,
                log.EntityId,
                log.Details,
                log.IpAddress,
                log.CreatedAt
            })
            .ToListAsync(cancellationToken);

        var actorIds = rows
            .Where(row => row.ActorUserId.HasValue)
            .Select(row => row.ActorUserId!.Value)
            .Distinct()
            .ToList();

        var actors = actorIds.Count == 0
            ? new Dictionary<Guid, string>()
            : await _context.Users
                .AsNoTracking()
                .Where(user => actorIds.Contains(user.Id))
                .ToDictionaryAsync(user => user.Id, user => user.FullName ?? "", cancellationToken);

        var data = rows.Select(row => new AuditLogDto
        {
            Id = row.Id,
            ActorUserId = row.ActorUserId,
            ActorName = row.ActorUserId.HasValue && actors.TryGetValue(row.ActorUserId.Value, out var name)
                ? name
                : null,
            Action = row.Action,
            EntityType = row.EntityType,
            EntityId = row.EntityId,
            Details = row.Details,
            IpAddress = row.IpAddress,
            CreatedAt = row.CreatedAt
        }).ToList();

        var result = PaginatedResult<AuditLogDto>.Success(data, totalCount, pageNumber, pageSize);

        return Success(result);
    }
}

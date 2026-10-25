using CenterManagement.Core.Features.Centers.Queries.Models;
using CenterManagement.Core.Wrappers;
using CenterManagement.Data.AppMetaData;
using CenterManagement.Data.Enums;
using CenterManagement.Infrustructure.Data;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Localization;

namespace CenterManagement.Core.Features.Centers.Queries.Handlers;

public class GetCentersPaginatedQueryHandler
    : ResponseHandler, IRequestHandler<GetCentersPaginatedQuery, Response<PaginatedResult<CenterListItemDto>>>
{
    private readonly AppDbContext _context;

    public GetCentersPaginatedQueryHandler(
        IStringLocalizer<SharedResources> localizer,
        AppDbContext context) : base(localizer)
    {
        _context = context;
    }

    public async Task<Response<PaginatedResult<CenterListItemDto>>> Handle(
        GetCentersPaginatedQuery request,
        CancellationToken cancellationToken)
    {
        var pageNumber = request.PageNumber <= 0 ? 1 : request.PageNumber;
        var pageSize = request.PageSize <= 0 ? 10 : request.PageSize;

        var query = _context.Centers.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var search = request.Search.Trim();
            query = query.Where(center =>
                center.Name.Contains(search) ||
                (center.Phone != null && center.Phone.Contains(search)));
        }

        if (!string.IsNullOrWhiteSpace(request.Status) &&
            Enum.TryParse<CenterStatus>(request.Status.Trim(), true, out var status))
        {
            query = query.Where(center => center.Status == status);
        }

        if (!string.IsNullOrWhiteSpace(request.Type) &&
            Enum.TryParse<CenterType>(request.Type.Trim(), true, out var type))
        {
            query = query.Where(center => center.Type == type);
        }

        var totalCount = await query.CountAsync(cancellationToken);

        var rows = await query
            .OrderByDescending(center => center.CreatedAt)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .Select(center => new
            {
                center.Id,
                center.Name,
                center.LogoUrl,
                center.Phone,
                center.Address,
                center.Type,
                center.Status,
                center.IsActive,
                center.OwnerId,
                OwnerName = center.Owner != null ? center.Owner.FullName : null,
                OwnerPhone = center.Owner != null ? center.Owner.PhoneNumber : null,
                center.SubscriptionStart,
                center.SubscriptionEnd,
                center.Plan,
                center.CreatedAt
            })
            .ToListAsync(cancellationToken);

        var centerIds = rows.Select(row => row.Id).ToList();

        var teacherCounts = await CountUsersByCenterAsync(AppRoles.Teacher, centerIds, cancellationToken);
        var studentCounts = await CountUsersByCenterAsync(AppRoles.Student, centerIds, cancellationToken);

        var groupCounts = await _context.Groups.AsNoTracking()
            .Where(group => group.CenterId != null && centerIds.Contains(group.CenterId.Value))
            .GroupBy(group => group.CenterId!.Value)
            .Select(g => new { CenterId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.CenterId, x => x.Count, cancellationToken);

        var data = rows.Select(row => new CenterListItemDto
        {
            Id = row.Id,
            Name = row.Name,
            LogoUrl = row.LogoUrl,
            Phone = row.Phone,
            Address = row.Address,
            Type = row.Type.ToString(),
            Status = row.Status.ToString(),
            IsActive = row.IsActive,
            OwnerId = row.OwnerId,
            OwnerName = row.OwnerName,
            OwnerPhone = row.OwnerPhone,
            TeachersCount = teacherCounts.GetValueOrDefault(row.Id),
            StudentsCount = studentCounts.GetValueOrDefault(row.Id),
            GroupsCount = groupCounts.GetValueOrDefault(row.Id),
            SubscriptionStart = row.SubscriptionStart,
            SubscriptionEnd = row.SubscriptionEnd,
            Plan = row.Plan,
            CreatedAt = row.CreatedAt
        }).ToList();

        var result = PaginatedResult<CenterListItemDto>.Success(data, totalCount, pageNumber, pageSize);

        return Success(result);
    }

    private async Task<Dictionary<Guid, int>> CountUsersByCenterAsync(
        string roleName,
        List<Guid> centerIds,
        CancellationToken cancellationToken)
    {
        return await (
            from user in _context.Users.AsNoTracking()
            join userRole in _context.UserRoles.AsNoTracking() on user.Id equals userRole.UserId
            join role in _context.Roles.AsNoTracking() on userRole.RoleId equals role.Id
            where role.Name == roleName && user.CenterId != null && centerIds.Contains(user.CenterId.Value)
            group user by user.CenterId!.Value into g
            select new { CenterId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.CenterId, x => x.Count, cancellationToken);
    }
}

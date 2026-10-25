using CenterManagement.Core.Features.UsersFeature.Teacher.Queries.Dtos;
using CenterManagement.Core.Features.UsersFeature.Teacher.Queries.Models;
using CenterManagement.Data.AppMetaData;
using CenterManagement.Data.Entities.Abstractions;
using CenterManagement.Data.Entities.Identity;
using CenterManagement.Infrustructure.Data;
using CenterManagement.Infrustructure.InfrastructureBases.Bases;

namespace CenterManagement.Core.Features.UsersFeature.Teacher.Queries.Handlers;

public class GetTeachersPaginatedQueryHandler
    : ResponseHandler, IRequestHandler<GetTeachersPaginatedQuery, Response<PaginatedResult<TeacherDto>>>
{
    private readonly AppDbContext _context;
    private readonly ITenantContext _tenantContext;

    public GetTeachersPaginatedQueryHandler(
        IStringLocalizer<SharedResources> localizer,
        AppDbContext context,
        ITenantContext tenantContext) : base(localizer)
    {
        _context = context;
        _tenantContext = tenantContext;
    }

    public async Task<Response<PaginatedResult<TeacherDto>>> Handle(
        GetTeachersPaginatedQuery request,
        CancellationToken cancellationToken)
    {
        var centerId = _tenantContext.IsUnrestricted
            ? (request.CenterId ?? _tenantContext.CenterId)
            : _tenantContext.CenterId;

        var teacherRoleId = await _context.Roles
            .Where(r => r.Name == AppRoles.Teacher)
            .Select(r => r.Id)
            .FirstOrDefaultAsync(cancellationToken);

        // No teachers role yet -> empty result.
        if (teacherRoleId == Guid.Empty)
            return Success(PaginatedResult<TeacherDto>.Success([], 0, request.PageNumber, request.PageSize));

        var query =
            from u in _context.Users
            join ur in _context.UserRoles on u.Id equals ur.UserId
            where ur.RoleId == teacherRoleId
            select u;

        if (centerId.HasValue)
            query = query.Where(u => u.CenterId == centerId);
        else if (!_tenantContext.IsUnrestricted)
            query = query.Where(u => false);

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var search = request.Search.Trim();
            query = query.Where(u => u.FullName.Contains(search) || u.PhoneNumber!.Contains(search));
        }

        var totalCount = await query.CountAsync(cancellationToken);

        var items = await query
            .OrderBy(u => u.FullName)
            .Skip((request.PageNumber - 1) * request.PageSize)
            .Take(request.PageSize)
            .Select(u => new TeacherDto
            {
                Id = u.Id,
                FullName = u.FullName,
                PhoneNumber = u.PhoneNumber,
                CenterId = u.CenterId,
                CreatedAt = u.CreatedAt
            })
            .ToListAsync(cancellationToken);

        if (items.Count > 0)
        {
            var teacherIds = items.Select(i => i.Id).ToList();

            var links = await _context.TeacherGroups
                .Where(tg => teacherIds.Contains(tg.TeacherId))
                .Select(tg => new
                {
                    tg.TeacherId,
                    Group = new TeacherGroupDto { Id = tg.GroupId, Name = tg.Group.Name }
                })
                .ToListAsync(cancellationToken);

            var lookup = links
                .GroupBy(x => x.TeacherId)
                .ToDictionary(g => g.Key, g => g.Select(x => x.Group).ToList());

            var subjects = await _context.TeacherProfiles
                .Where(p => teacherIds.Contains(p.UserId))
                .Select(p => new { p.UserId, p.Subject })
                .ToListAsync(cancellationToken);

            var subjectLookup = subjects
                .GroupBy(x => x.UserId)
                .ToDictionary(g => g.Key, g => g.Select(x => x.Subject).FirstOrDefault());

            foreach (var item in items)
            {
                if (lookup.TryGetValue(item.Id, out var groups))
                    item.Groups = groups;

                if (subjectLookup.TryGetValue(item.Id, out var subject))
                    item.Subject = subject;
            }
        }

        return Success(PaginatedResult<TeacherDto>.Success(
            items, totalCount, request.PageNumber, request.PageSize));
    }
}

using CenterManagement.Core.Features.Groups.Queries.Models;

namespace CenterManagement.Core.Features.Groups.Queries.Handlers;

public class GroupQueryHandler : ResponseHandler,
    IRequestHandler<GetGroupListQuery, Response<List<GetGroupListResponse>>>,
    IRequestHandler<GetGroupByIdQuery, Response<GetGroupByIdResponse>>,
    IRequestHandler<GetGroupsPaginationQuery, PaginatedResult<GetGroupsPaginationResponse>>
{
    #region Fields
    private readonly AppDbContext _context;
    private readonly IStringLocalizer<SharedResources> _stringLocalizer;
    private readonly IUserScopeService _scopeService;
    #endregion

    #region Constructors
    public GroupQueryHandler(IStringLocalizer<SharedResources> stringLocalizer,
                             AppDbContext context,
                             IUserScopeService scopeService) : base(stringLocalizer)
    {
        _stringLocalizer = stringLocalizer;
        _context = context;
        _scopeService = scopeService;
    }
    #endregion

    #region Handle Functions

    #region Get All Group
    public async Task<Response<List<GetGroupListResponse>>> Handle(GetGroupListQuery request, CancellationToken cancellationToken)
    {
        try
        {
            var scope = await _scopeService.ResolveAsync(cancellationToken);

            var groups = await _context.Groups
                .AsNoTracking()
                .Where(g => !g.IsDeleted)
                .ScopeToUser(scope)
                .Select(g => new GetGroupListResponse
                {
                    Id = g.Id,
                    Name = g.Name,
                })
                .ToListAsync(cancellationToken);

            if (groups == null || !groups.Any())
                return NotFound<List<GetGroupListResponse>>("لم يتم اضافة جروبات حتي الان");

            return Success(groups);
        }
        catch (Exception)
        {
            throw;
        }
    }
    #endregion

    #region Get Group By ID
    public async Task<Response<GetGroupByIdResponse>> Handle(GetGroupByIdQuery request, CancellationToken cancellationToken)
    {
        var scope = await _scopeService.ResolveAsync(cancellationToken);

        var group = await _context.Groups
            .AsNoTracking()
            .Where(g => !g.IsDeleted && g.Id == request.Id)
            .ScopeToUser(scope)
            .Select(g => new GetGroupByIdResponse
            {
                Id = g.Id,
                Name = g.Name,
                MonthlyPrice = g.MonthlyPrice,
                TotalStudentsCount = _context.StudentGroups.Count(sg => sg.GroupId == g.Id && sg.IsActive && sg.LeftAt == null && sg.Student.IsActive),
                CreatedAt = g.CreatedAt,
                SessionsPerMonth = g.SessionsPerMonth,
            })
            .FirstOrDefaultAsync(cancellationToken);

        if (group == null)
            return NotFound<GetGroupByIdResponse>(_stringLocalizer[SharedResourcesKeys.NotFound]);

        return Success(group);
    }
    #endregion

    #region Get Paginated Groups
    public async Task<PaginatedResult<GetGroupsPaginationResponse>> Handle(GetGroupsPaginationQuery request, CancellationToken cancellationToken)
    {
        var scope = await _scopeService.ResolveAsync(cancellationToken);

        var query = _context.Groups.AsNoTracking().Where(x => !x.IsDeleted).ScopeToUser(scope).AsQueryable();

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var search = request.Search.Trim();
            query = query.Where(x => x.Name.Contains(search));
        }

        var projectedQuery = query.Select(g => new GetGroupsPaginationResponse
        {
            Id = g.Id,
            Name = g.Name,
            MonthlyPrice = g.MonthlyPrice,
            SessionsPerMonth = g.SessionsPerMonth,
            TotalStudentsCount = _context.StudentGroups.Count(sg => sg.GroupId == g.Id && sg.IsActive && sg.LeftAt == null && sg.Student.IsActive),
            TeacherId = _context.TeacherGroups
                .Where(tg => tg.GroupId == g.Id)
                .Select(tg => (Guid?)tg.TeacherId)
                .FirstOrDefault(),
            CenterType = _context.Centers.Where(c => c.Id == g.CenterId).Select(c => c.Type.ToString()).FirstOrDefault(),
            SoloTeacherSubject = _context.TeacherProfiles
                .Where(tp => tp.User.CenterId == g.CenterId && tp.User.IsCenterAdmin)
                .Select(tp => tp.Subject)
                .FirstOrDefault()
        });

        var paginatedList = await projectedQuery.ToPaginatedListAsync(request.PageNumber, request.PageSize);

        // Enrich the page with schedule + per-session price read from the real
        // Session rows (the Group entity has no such columns).
        var items = paginatedList.Data;
        if (items != null && items.Count > 0)
        {
            var ids = items.Select(i => i.Id).ToList();

            var sessions = await _context.Sessions
                .AsNoTracking()
                .Where(s => ids.Contains(s.GroupId) && !s.IsDeleted)
                .Select(s => new { s.GroupId, s.DayOfWeek, s.StartTime, s.EndTime, s.SessionPrice })
                .ToListAsync(cancellationToken);

            var byGroup = sessions
                .GroupBy(s => s.GroupId)
                .ToDictionary(g => g.Key, g => g.OrderBy(x => x.DayOfWeek).ToList());

            foreach (var item in items)
            {
                if (!byGroup.TryGetValue(item.Id, out var groupSessions) || groupSessions.Count == 0)
                    continue;

                item.PerSessionPrice = groupSessions[0].SessionPrice;
                item.Schedule = groupSessions
                    .Select(s => new GroupScheduleItem
                    {
                        DayOfWeek = (int)s.DayOfWeek,
                        StartTime = s.StartTime.ToString("HH:mm"),
                        EndTime = s.EndTime.ToString("HH:mm")
                    })
                    .ToList();
            }
        }

        return paginatedList;
    }

    #endregion

    #endregion
}
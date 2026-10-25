using CenterManagement.Core.Features.AttendenceFeature.Queries.Models;
using CenterManagement.Infrustructure.InfrastructureBases.Bases;

namespace CenterManagement.Core.Features.AttendenceFeature.Queries.Handlers;

public class GetRunningSessionsQueryHandler : ResponseHandler,
    IRequestHandler<GetRunningSessionsQuery, Response<List<RunningSessionDTO>>>
{
    private readonly IRepositoryManager _repositoryManager;
    private readonly IUserScopeService _scopeService;

    public GetRunningSessionsQueryHandler(
        IRepositoryManager repositoryManager,
        IUserScopeService scopeService,
        IStringLocalizer<SharedResources> stringLocalizer) : base(stringLocalizer)
    {
        _repositoryManager = repositoryManager;
        _scopeService = scopeService;
    }

    public async Task<Response<List<RunningSessionDTO>>> Handle(
        GetRunningSessionsQuery request,
        CancellationToken cancellationToken)
    {
        var scope = await _scopeService.ResolveAsync(cancellationToken);

        var date = request.Date ?? DateOnly.FromDateTime(DateTime.Now);
        var now = TimeOnly.FromDateTime(DateTime.Now);

        var sessions = await _repositoryManager
            .SessionRepository
            .GetTableNoTracking()
            .Where(x =>
                !x.IsDeleted &&
                x.DayOfWeek == date.DayOfWeek &&
                x.StartTime <= now &&
                x.EndTime >= now)
            .ScopeToUser(scope)
            .OrderBy(x => x.StartTime)
            .Select(x => new RunningSessionDTO
            {
                SessionId = x.Id,
                GroupId = x.GroupId,
                GroupName = x.Group != null ? x.Group.Name : string.Empty,
                DayOfWeek = x.DayOfWeek,
                StartTime = x.StartTime,
                EndTime = x.EndTime,
                StudentsCount = 0
            })
            .ToListAsync(cancellationToken);

        if (sessions.Count == 0)
            return Success(new List<RunningSessionDTO>());

        var groupIds = sessions.Select(s => s.GroupId).Distinct().ToList();

        var counts = await _repositoryManager
            .StudentGroupRepository
            .GetTableNoTracking()
            .Where(sg =>
                groupIds.Contains(sg.GroupId) &&
                sg.IsActive &&
                sg.LeftAt == null &&
                sg.Student != null &&
                sg.Student.IsActive)
            .GroupBy(sg => sg.GroupId)
            .Select(g => new
            {
                GroupId = g.Key,
                Count = g.Count()
            })
            .ToListAsync(cancellationToken);

        var countMap = counts.ToDictionary(c => c.GroupId, c => c.Count);

        foreach (var session in sessions)
        {
            if (countMap.TryGetValue(session.GroupId, out var count))
                session.StudentsCount = count;
        }

        return Success(sessions);
    }
}
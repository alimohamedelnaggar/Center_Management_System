using CenterManagement.Core.Features.Reports.Responses;
using CenterManagement.Infrustructure.InfrastructureBases.Bases;

namespace CenterManagement.Core.Features.Reports.Queries.GetStudentGroupsHistory;

public class GetStudentGroupsHistoryHandler : ResponseHandler,
    IRequestHandler<GetStudentGroupsHistoryQuery, Response<List<StudentGroupHistoryDto>>>
{
    private readonly IRepositoryManager _repositoryManager;
    private readonly IUserScopeService _scopeService;

    public GetStudentGroupsHistoryHandler(
        IRepositoryManager repositoryManager,
        IUserScopeService scopeService,
        IStringLocalizer<SharedResources> stringLocalizer)
        : base(stringLocalizer)
    {
        _repositoryManager = repositoryManager;
        _scopeService = scopeService;
    }

    public async Task<Response<List<StudentGroupHistoryDto>>> Handle(
        GetStudentGroupsHistoryQuery request,
        CancellationToken cancellationToken)
    {
        var student = await _repositoryManager.StudentRepository
            .GetDetailsAsync(request.StudentId);

        if (student is null)
            return NotFound<List<StudentGroupHistoryDto>>();

        if (!await _scopeService.AllowsStudentAsync(request.StudentId, cancellationToken))
            return Forbidden<List<StudentGroupHistoryDto>>();

        var result = student.StudentGroups
            .OrderByDescending(sg => sg.JoinDate)
            .Select(sg => new StudentGroupHistoryDto
            {
                GroupId = sg.GroupId,
                GroupName = sg.Group.Name,
                JoinDate = sg.JoinDate,
                LeftAt = sg.LeftAt,
                IsActive = sg.IsActive && sg.LeftAt == null
            })
            .ToList();

        return Success(result);
    }
}
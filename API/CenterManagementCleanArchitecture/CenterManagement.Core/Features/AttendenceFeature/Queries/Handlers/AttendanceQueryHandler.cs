using CenterManagement.Core.Features.AttendenceFeature.Queries.Models;
using CenterManagement.Infrustructure.InfrastructureBases.Bases;

namespace CenterManagement.Core.Features.AttendenceFeature.Queries.Handlers;

public class AttendanceQueryHandler :
    ResponseHandler,
    IRequestHandler<GetAttendanceStatsQuery, Response<AttendanceStatsDTO>>
{
    #region Fields

    private readonly IRepositoryManager _repositoryManager;
    private readonly IUserScopeService _scopeService;

    #endregion

    #region Constructors

    public AttendanceQueryHandler(
        IRepositoryManager repositoryManager,
        IUserScopeService scopeService,
        IStringLocalizer<SharedResources> localizer)
        : base(localizer)
    {
        _repositoryManager = repositoryManager;
        _scopeService = scopeService;
    }

    #endregion

    #region Handle

    public async Task<Response<AttendanceStatsDTO>> Handle(
        GetAttendanceStatsQuery request,
        CancellationToken cancellationToken)
    {
        var scope = await _scopeService.ResolveAsync(cancellationToken);

        var stats = await _repositoryManager
            .AttendanceRepository
            .GetAttendanceStatsAsync(scope.CenterWide ? null : scope.GroupIds);

        return Success(stats);
    }

    #endregion
}
using CenterManagement.Core.Features.Exams.Queries.Models;
using CenterManagement.Infrustructure.InfrastructureBases.Bases;
using CenterManagement.Infrustructure.Results;

namespace CenterManagement.Core.Features.Exams.Queries.Handlers;

public class ExamStatsQueryHandler :
    ResponseHandler,
    IRequestHandler<GetExamStatsQuery, Response<ExamStatsDTO>>
{
    #region Fields

    private readonly IRepositoryManager _repositoryManager;
    private readonly IUserScopeService _scopeService;

    #endregion

    #region Constructors

    public ExamStatsQueryHandler(
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

    public async Task<Response<ExamStatsDTO>> Handle(
        GetExamStatsQuery request,
        CancellationToken cancellationToken)
    {
        var scope = await _scopeService.ResolveAsync(cancellationToken);

        if (!scope.Allows(request.GroupId))
            return NotFound<ExamStatsDTO>("المجموعة غير موجودة.");

        var stats = await _repositoryManager
            .ExamRepository
            .GetExamStatsAsync(
                request.GroupId,
                request.SessionId,
                request.ExamId);

        return Success(stats);
    }

    #endregion
}

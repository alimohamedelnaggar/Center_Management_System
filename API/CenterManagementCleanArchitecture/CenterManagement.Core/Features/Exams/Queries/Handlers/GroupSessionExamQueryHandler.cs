using CenterManagement.Core.Features.Exams.Queries.Models;
using CenterManagement.Core.Features.Exams.Queries.Results;
using CenterManagement.Infrustructure.InfrastructureBases.Bases;

namespace CenterManagement.Core.Features.Exams.Queries.Handlers;

public class GroupSessionExamQueryHandler :
    ResponseHandler,
    IRequestHandler<GetGroupSessionExamsQuery, Response<List<ExamResponse>>>
{
    #region Fields

    private readonly IRepositoryManager _repositoryManager;
    private readonly IUserScopeService _scopeService;

    #endregion

    #region Constructors

    public GroupSessionExamQueryHandler(
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

    public async Task<Response<List<ExamResponse>>> Handle(GetGroupSessionExamsQuery request, CancellationToken cancellationToken)
    {
        var scope = await _scopeService.ResolveAsync(cancellationToken);

        if (!scope.Allows(request.GroupId))
            return NotFound<List<ExamResponse>>("المجموعة غير موجودة.");

        var groupSessionExams = await _repositoryManager
            .ExamRepository
            .GetTableNoTracking()
            .Where(x => x.GroupId == request.GroupId && x.SessionId == request.SessionId)
            .Select(x => new ExamResponse
            {
                Id = x.Id,
                Name = x.Name
            })
            .ToListAsync();

        return Success(groupSessionExams);
    }

    #endregion
}

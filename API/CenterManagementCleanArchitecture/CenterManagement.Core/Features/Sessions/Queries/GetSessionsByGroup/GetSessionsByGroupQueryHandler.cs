
using CenterManagement.Core.Features.Sessions.Queries.GetSessionsByGroup;
using CenterManagement.Core.Features.Sessions.Responses;
using CenterManagement.Infrustructure.InfrastructureBases.Bases;
using MediatR;

namespace CenterManagement.Application.Features.Sessions.Queries.GetSessionsByGroup;

public sealed class GetSessionsByGroupQueryHandler
    : ResponseHandler,
      IRequestHandler<GetSessionsByGroupQuery, Response<List<GetSessionsByGroupResponse>>>
{
    private readonly IRepositoryManager _repositoryManager;
    private readonly IUserScopeService _scopeService;

    public GetSessionsByGroupQueryHandler(IRepositoryManager repositoryManager, IUserScopeService scopeService, IStringLocalizer<SharedResources> stringLocalizer) : base(stringLocalizer)
    {
        _repositoryManager = repositoryManager;
        _scopeService = scopeService;
    }

    public async Task<Response<List<GetSessionsByGroupResponse>>> Handle(
        GetSessionsByGroupQuery request,
        CancellationToken cancellationToken)
    {
        var scope = await _scopeService.ResolveAsync(cancellationToken);

        if (!scope.Allows(request.GroupId))
            return NotFound<List<GetSessionsByGroupResponse>>("Group not found.");

        var sessions = await _repositoryManager.SessionRepository
            .GetByGroupAsync(request.GroupId, cancellationToken);

        var response = sessions.Select(x => new GetSessionsByGroupResponse
        {
            Id = x.Id,
            DayOfWeek = x.DayOfWeek,
            StartTime = x.StartTime,
            EndTime = x.EndTime,
            SessionPrice = x.SessionPrice
        }).ToList();

        return Success(response);
    }
}
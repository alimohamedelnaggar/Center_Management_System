using CenterManagement.Core.Features.Sessions.Responses;
using CenterManagement.Infrustructure.InfrastructureBases.Bases;
using System;
using System.Collections.Generic;
using System.Text;

namespace CenterManagement.Core.Features.Sessions.Queries.GetSessionById
{
    public sealed class GetSessionByIdQueryHandler
    : ResponseHandler,
      IRequestHandler<GetSessionByIdQuery, Response<GetSessionByIdResponse>>
    {
        private readonly IRepositoryManager _repositoryManager;
        private readonly IUserScopeService _scopeService;

        public GetSessionByIdQueryHandler(IRepositoryManager repositoryManager, IUserScopeService scopeService, IStringLocalizer<SharedResources> stringLocalizer) : base(stringLocalizer)
        {
            _repositoryManager = repositoryManager;
            _scopeService = scopeService;
        }

        public async Task<Response<GetSessionByIdResponse>> Handle(
            GetSessionByIdQuery request,
            CancellationToken cancellationToken)
        {
            var scope = await _scopeService.ResolveAsync(cancellationToken);

            var session = await _repositoryManager.SessionRepository
                .GetDetailsAsync(request.Id, cancellationToken);

            if (session is null || !scope.Allows(session.GroupId))
                return NotFound<GetSessionByIdResponse>("Session not found.");

            return Success(new GetSessionByIdResponse
            {
                Id = session.Id,
                GroupId = session.GroupId,
                DayOfWeek = session.DayOfWeek,
                StartTime = session.StartTime,
                EndTime = session.EndTime,
                SessionPrice = session.SessionPrice
            });
        }
    }
}

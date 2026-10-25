
using CenterManagement.Core.Features.Sessions.Commands.AddSessions;
using CenterManagement.Core.Hubs.Abstractions;
using CenterManagement.Data.Entities.Groups;
using CenterManagement.Infrustructure.InfrastructureBases.Bases;
using MediatR;

namespace CenterManagement.Application.Features.Sessions.Commands.AddSession;

public sealed class AddSessionCommandHandler
    : ResponseHandler,
      IRequestHandler<AddSessionCommand, Response<Guid>>
{
    private readonly IRepositoryManager _repositoryManager;
    private readonly ISessionNotificationService notificationService;
    private readonly IUserScopeService _scopeService;

    public AddSessionCommandHandler(IRepositoryManager repositoryManager,IStringLocalizer<SharedResources> stringLocalizer, ISessionNotificationService notificationService, IUserScopeService scopeService) :base(stringLocalizer)
    {
        _repositoryManager = repositoryManager;
        this.notificationService = notificationService;
        _scopeService = scopeService;
    }

    public async Task<Response<Guid>> Handle(
        AddSessionCommand request,
        CancellationToken cancellationToken)
    {
        var scope = await _scopeService.ResolveAsync(cancellationToken);

        if (!scope.Allows(request.GroupId))
            return NotFound<Guid>("Group not found.");

        var groupExists = await _repositoryManager.GroupRepository
            .GetByIdAsync(request.GroupId);

        if (groupExists is null)
            return NotFound<Guid>("Group not found.");

        var hasConflict = await _repositoryManager.SessionRepository
            .HasTimeConflictAsync(
                request.GroupId,
                request.DayOfWeek,
                request.StartTime,
                request.EndTime,
                cancellationToken: cancellationToken);

        if (hasConflict)
            return BadRequest<Guid>(
                "There is already another session that overlaps with this time.");

        var session = new Session
        {
            GroupId = request.GroupId,
            DayOfWeek = request.DayOfWeek,
            StartTime = request.StartTime,
            EndTime = request.EndTime,
            SessionPrice = request.SessionPrice
        };

        await _repositoryManager.SessionRepository.AddAsync(session);

        await notificationService.SessionAddedAsync(session.Id);

        await _repositoryManager.SaveChangesAsync();

        return Created(session.Id, "Session created successfully.");
    }
}
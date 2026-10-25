
using CenterManagement.Core.Hubs.Abstractions;
using CenterManagement.Infrustructure.InfrastructureBases.Bases;
using MediatR;

namespace CenterManagement.Application.Features.Sessions.Commands.EditSession;

public sealed class EditSessionCommandHandler
    : ResponseHandler,
      IRequestHandler<EditSessionCommand, Response<Guid>>
{
    private readonly IRepositoryManager _repositoryManager;
    private readonly ISessionNotificationService notificationService;
    private readonly IUserScopeService _scopeService;

    public EditSessionCommandHandler(IRepositoryManager repositoryManager,IStringLocalizer<SharedResources> stringLocalizer, ISessionNotificationService notificationService, IUserScopeService scopeService) :base(stringLocalizer)
    {
        _repositoryManager = repositoryManager;
        this.notificationService = notificationService;
        _scopeService = scopeService;
    }

    public async Task<Response<Guid>> Handle(
        EditSessionCommand request,
        CancellationToken cancellationToken)
    {
        var scope = await _scopeService.ResolveAsync(cancellationToken);

        var session = await _repositoryManager.SessionRepository
            .GetByIdAsync(request.Id);

        if (session is null || !scope.Allows(session.GroupId))
            return NotFound<Guid>("Session not found.");

        var groupExists = await _repositoryManager.GroupRepository
            .GetByIdAsync(request.GroupId);

        if (groupExists is null || !scope.Allows(request.GroupId))
            return NotFound<Guid>("Group not found.");

        var hasConflict = await _repositoryManager.SessionRepository
            .HasTimeConflictAsync(
                request.GroupId,
                request.DayOfWeek,
                request.StartTime,
                request.EndTime,
                request.Id, 
                cancellationToken);

        if (hasConflict)
            return BadRequest<Guid>(
                "There is already another session that overlaps with this time.");

        session.GroupId = request.GroupId;
        session.DayOfWeek = request.DayOfWeek;
        session.StartTime = request.StartTime;
        session.EndTime = request.EndTime;
        session.SessionPrice = request.SessionPrice;


        await _repositoryManager.SaveChangesAsync();

        await notificationService.SessionUpdatedAsync(session.Id);

        return Success(session.Id, "Session updated successfully.");
    }
}
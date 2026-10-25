using CenterManagement.Core.Features.Sessions.Commands.DeleteSessions;
using CenterManagement.Core.Hubs.Abstractions;
using CenterManagement.Infrustructure.InfrastructureBases.Bases;

namespace CenterManagement.Application.Features.Sessions.Commands.DeleteSession;

public sealed class DeleteSessionCommandHandler
    : ResponseHandler,
      IRequestHandler<DeleteSessionCommand, Response<Guid>>
{
    private readonly IRepositoryManager _repositoryManager;
    private readonly ISessionNotificationService notificationService;
    private readonly IUserScopeService _scopeService;

    public DeleteSessionCommandHandler(
        IRepositoryManager repositoryManager,
        IStringLocalizer<SharedResources> stringLocalizer, ISessionNotificationService notificationService, IUserScopeService scopeService)
        : base(stringLocalizer)
    {
        _repositoryManager = repositoryManager;
        this.notificationService = notificationService;
        _scopeService = scopeService;
    }

    public async Task<Response<Guid>> Handle(
        DeleteSessionCommand request,
        CancellationToken cancellationToken)
    {
        var scope = await _scopeService.ResolveAsync(cancellationToken);

        var session = await _repositoryManager.SessionRepository
            .GetByIdAsync(request.Id, cancellationToken);

        if (session is null || !scope.Allows(session.GroupId))
            return NotFound<Guid>("Session not found.");

        var hasAttendance = await _repositoryManager.SessionRepository
            .HasAttendanceAsync(request.Id, cancellationToken);

        if (hasAttendance)
            return BadRequest<Guid>(
                "Cannot delete this session because attendance records exist.");

        session.IsDeleted = true;

        await _repositoryManager.SaveChangesAsync();

        await notificationService.SessionDeletedAsync(session.Id);

        return Deleted<Guid>("Session deleted successfully.");
    }
}
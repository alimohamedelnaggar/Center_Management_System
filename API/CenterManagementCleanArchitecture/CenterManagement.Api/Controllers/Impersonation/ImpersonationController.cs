using CenterManagement.Api.Base;
using CenterManagement.Core.Features.Impersonation.Commands.Models;

namespace CenterManagement.Api.Controllers.Impersonation;

[PlatformEndpoint]
public class ImpersonationController : AppControllerBase
{
    [HttpPost(Routing.ImpersonationRouting.Start)]
    [Authorize(Policy = AppPolicies.PlatformAdmin)]
    public async Task<IActionResult> Start(ImpersonateUserCommand command)
    {
        var response = await _mediator.Send(command);
        return NewResult(response);
    }

    // Callable with the impersonation token itself (only requires a valid JWT).
    [HttpPost(Routing.ImpersonationRouting.Stop)]
    public async Task<IActionResult> Stop()
    {
        var response = await _mediator.Send(new StopImpersonationCommand());
        return NewResult(response);
    }
}

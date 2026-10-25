
using CenterManagement.Core.Features.Shared.EmailFeature.Commands.Models;

namespace CenterManagement.API.Controllers;

[Authorize(Policy = AppPolicies.PlatformAdmin)]
[PlatformEndpoint]
public class EmailController : AppControllerBase
{
    [HttpPost(Routing.EmailsRoute.SendEmail)]
    public async Task<IActionResult> SendEmail([FromQuery] SendEmailCommand command)
    {
        var response = await _mediator.Send(command);
        return NewResult(response);
    }
}
using CenterManagement.Api.Base;
using CenterManagement.Core.Features.Auth.ApplicationUser.Commands.Models;
using CenterManagement.Data.AppMetaData;
using Microsoft.AspNetCore.Authorization;

namespace CenterManagement.Api.Controllers.Platform;

/// <summary>
/// Platform-operator actions that operate on user accounts regardless of the
/// center they belong to. SuperAdmin only.
/// </summary>
[PlatformEndpoint]
public class PlatformUserController : AppControllerBase
{
    // Resets a user's password to a generated temporary one, shown once.
    [HttpPost(Routing.ApplicationUserRouting.ResetPassword)]
    [Authorize(Policy = AppPolicies.PlatformAdmin)]
    public async Task<IActionResult> ResetPassword([FromBody] ResetUserPasswordCommand command)
    {
        var response = await _mediator.Send(command);
        return NewResult(response);
    }
}

using CenterManagement.Api.RateLimiting;
using CenterManagement.Core.Features.Auth.ManagePasswordFeature.Command.Models;

namespace CenterManagement.API.Controllers.Auth;

[CoreEndpoint]
public class ManagePasswordController : AppControllerBase
{
    /// <summary>
    /// Emails a one-time reset code to the account that owns the phone number.
    /// Always returns the same response so account existence is not leaked.
    /// </summary>
    [HttpPost(Routing.Authentication.SendResetCode)]
    [AllowAnonymous]
    [SignInRateLimited]
    public async Task<IActionResult> SendResetCode([FromBody] SendResetCodeCommand command)
    {
        var response = await _mediator.Send(command);
        return NewResult(response);
    }

    /// <summary>
    /// Exchanges a valid, unexpired, unused code for a new password.
    /// </summary>
    [HttpPost(Routing.Authentication.ResetPassword)]
    [AllowAnonymous]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordCommand command)
    {
        var response = await _mediator.Send(command);
        return NewResult(response);
    }
}

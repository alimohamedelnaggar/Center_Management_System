using CenterManagement.Api.RateLimiting;
using CenterManagement.Core.Features.Auth.Authentication.Query.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;

namespace CenterManagement.API.Controllers.Auth;

/// <summary>
/// Public, rate-limited confirmation links. Both endpoints are anonymous by
/// nature (the link is opened from a mail client), so each one is guarded by the
/// same per-IP/per-identifier limiter as sign-in and never reveals account
/// details: success and failure both land on a static front-end page.
/// </summary>
[CoreEndpoint]
[AllowAnonymous]
public class ConfirmEmailController : AppControllerBase
{
    [HttpGet(Routing.Authentication.ConfirmEmail)]
    [RecoveryRateLimited]
    public async Task<IActionResult> ConfirmEmail([FromQuery] ConfirmEmailQuery query)
    {
        var response = await _mediator.Send(query);

        return RedirectToResultPage(response.Succeeded);
    }

    [HttpGet(Routing.Authentication.ConfirmEmailChange)]
    [RecoveryRateLimited]
    public async Task<IActionResult> ConfirmEmailChange([FromQuery] ConfirmEmailChangeQuery query)
    {
        var response = await _mediator.Send(query);

        return RedirectToResultPage(response.Succeeded);
    }

    private IActionResult RedirectToResultPage(bool succeeded)
    {
        var configuration = HttpContext.RequestServices.GetRequiredService<IConfiguration>();
        var baseUrl = (configuration["App:FrontendBaseUrl"] ?? "http://localhost:5173").TrimEnd('/');
        var status = succeeded ? "success" : "invalid";

        return Redirect($"{baseUrl}/email-confirmed?status={status}");
    }
}

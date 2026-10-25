using CenterManagement.Api.Base;
using CenterManagement.Core.Features.Platform.Commands.Models;
using CenterManagement.Core.Features.Platform.Queries.Models;

namespace CenterManagement.Api.Controllers.Platform;

[PlatformEndpoint]
public class PlatformController : AppControllerBase
{
    [HttpGet(Routing.PlatformRouting.Statistics)]
    [Authorize(Policy = AppPolicies.PlatformAdmin)]
    public async Task<IActionResult> Statistics()
    {
        var response = await _mediator.Send(new GetPlatformStatisticsQuery());
        return NewResult(response);
    }

    /// <summary>
    /// One-off migration: force the password change on legacy student/parent
    /// accounts that still use their phone number as the password.
    /// Idempotent; safe to run more than once.
    /// </summary>
    [HttpPost(Routing.PlatformRouting.FlagLegacyPhonePasswords)]
    [Authorize(Policy = AppPolicies.PlatformAdmin)]
    public async Task<IActionResult> FlagLegacyPhonePasswords()
    {
        var response = await _mediator.Send(new FlagLegacyPhonePasswordsCommand());
        return NewResult(response);
    }
}

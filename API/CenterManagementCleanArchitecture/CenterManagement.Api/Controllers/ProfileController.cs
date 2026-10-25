using CenterManagement.Core.Features.Auth.Profile.Command.Models;
using CenterManagement.Core.Features.Auth.Profile.Query;
using CenterManagement.Core.Features.Auth.Profile.Query.Models;
using Microsoft.AspNetCore.Authorization;

namespace CenterManagement.API.Controllers.Auth;

[AllowAnonymous]
[CoreEndpoint]
public class ProfileController : AppControllerBase
{
    [HttpGet(Routing.ProfileRouting.GetMyProfile)]
    public async Task<IActionResult> GetMyProfile()
    {
        var response = await _mediator.Send(new GetMyProfileQuery());

        return NewResult(response);
    }
    [HttpPut(Routing.ProfileRouting.ChangePassword)]
    public async Task<IActionResult> ChangePassword(
        [FromBody] ChangeMyPasswordCommand command)
    {
        var response = await _mediator.Send(command);

        // The forced-change flow replaces both tokens: old refresh tokens were
        // revoked and the new access token no longer carries the temporary flag.
        if (response.Succeeded && response.Data?.RefreshToken is not null)
        {
            SetRefreshTokenCookie(
                response.Data.RefreshToken.TokenString,
                response.Data.RefreshToken.ExpireAt);
        }

        return NewResult(response);
    }

    private void SetRefreshTokenCookie(string token, DateTime expires)
    {
        Response.Cookies.Append("refreshToken", token, new CookieOptions
        {
            HttpOnly = true,
            Secure = true,
            SameSite = SameSiteMode.None,
            Expires = expires,
            Path = "/"
        });
    }

    [HttpPut(Routing.ProfileRouting.EditMyProfile)]
    public async Task<IActionResult> EditMyProfile(
        [FromBody] UpdateMySubjectCommand command)
    {
        var response = await _mediator.Send(command);

        return NewResult(response);
    }
}
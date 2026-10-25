using CenterManagement.Core.Features.Auth.Authentication.Command.Models;
using CenterManagement.Core.Features.Auth.RefreshTokenFeature.Command.Models;
using CenterManagement.Api.RateLimiting;

namespace CenterManagement.API.Controllers.Auth;

[CoreEndpoint]
public class AuthenticationController : AppControllerBase
{
    [HttpPost(Routing.Authentication.SignIn)]
    [AllowAnonymous]
    [SignInRateLimited]
    public async Task<IActionResult> SignIn(SignInCommand command)
    {
        var response = await _mediator.Send(command);
        if (!response.Succeeded) return BadRequest(response);

        SetRefreshTokenCookie(response.Data.RefreshToken.TokenString, response.Data.RefreshToken.ExpireAt);

        // Only the access token goes to the client body
        return Ok(new
        {
            accessToken = response.Data.AccessToken,
            mustChangePassword = response.Data.MustChangePassword,
            enabledModules = response.Data.EnabledModules,
            subscription = response.Data.Subscription
        });
    }
    [HttpPost(Routing.Authentication.RefreshToken)]
    [AllowAnonymous]
    public async Task<IActionResult> RefreshToken()
    {
        var refreshToken = Request.Cookies["refreshToken"];
        if (string.IsNullOrEmpty(refreshToken)) return Unauthorized();

        // access token can come from the Authorization header (even expired) instead of the body
        var accessToken = Request.Headers.Authorization
            .ToString().Replace("Bearer ", "");

        var response = await _mediator.Send(new RefreshTokenCommand { RefreshToken = refreshToken });
        if (!response.Succeeded)
        {
            Response.Cookies.Delete("refreshToken");
            return Unauthorized(response);
        }

        SetRefreshTokenCookie(response.Data.RefreshToken.TokenString, response.Data.RefreshToken.ExpireAt);
        return Ok(new
        {
            accessToken = response.Data.AccessToken,
            mustChangePassword = response.Data.MustChangePassword,
            enabledModules = response.Data.EnabledModules,
            subscription = response.Data.Subscription
        });
    }

    [HttpPost(Routing.Authentication.Logout)]
    public async Task<IActionResult> Logout()
    {
        Response.Cookies.Delete("refreshToken", new CookieOptions { Path = "/api/auth/refresh-token" });
        var response = await _mediator.Send(new LogoutCommand());
        return Ok(response);
    }

    private void SetRefreshTokenCookie(string token, DateTime expires)
    {
        Response.Cookies.Append("refreshToken", token, new CookieOptions
        {
            HttpOnly = true,
            Secure = true,           // required for SameSite=None; needs HTTPS
            SameSite = SameSiteMode.None, // "Strict" if front and back share the same site
            Expires = expires,
            //Path = "/api/V1/Authentication/refresh-token" // narrow scope so it isn't sent on every request
            Path = "/" // narrow scope so it isn't sent on every request
        });
    }


}
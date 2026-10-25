using System.Security.Claims;
using CenterManagement.Core.Features.Impersonation.Commands.Models;
using CenterManagement.Data.AppMetaData;
using CenterManagement.Data.Entities.Abstractions;
using Microsoft.Extensions.DependencyInjection;

namespace CenterManagement.Api.Middleware;

/// <summary>
/// Blocks authenticated requests coming from a deleted/inactive account or a
/// deleted/inactive/suspended/expired center, so suspending a center takes
/// effect immediately (not only at the next sign-in). SuperAdmin is exempt.
/// </summary>
public sealed class CenterAccessEnforcementMiddleware
{
    private readonly RequestDelegate _next;

    public CenterAccessEnforcementMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var principal = context.User;

        if (principal?.Identity?.IsAuthenticated != true)
        {
            await _next(context);
            return;
        }

        // The platform operator is never blocked.
        if (principal.IsInRole(AppRoles.SuperAdmin))
        {
            await _next(context);
            return;
        }

        // Support tooling: a SuperAdmin browsing as another user (impersonation)
        // must still be able to reach a suspended/expired center's screens.
        // Every impersonation session is audited at start.
        if (principal.HasClaim(ImpersonationClaims.IsImpersonation, ImpersonationClaims.TrueValue))
        {
            await _next(context);
            return;
        }

        var userIdValue = principal.FindFirstValue(ClaimTypes.NameIdentifier);

        if (!Guid.TryParse(userIdValue, out var userId))
        {
            await _next(context);
            return;
        }

        var access = context.RequestServices.GetRequiredService<IAccountAccessService>();
        var result = await access.CheckAsync(userId, context.RequestAborted);

        if (!result.Allowed)
        {
            context.Response.Clear();
            context.Response.StatusCode = IsUserIssue(result.Status) ? 401 : 403;
            context.Response.ContentType = "application/json; charset=utf-8";

            await context.Response.WriteAsJsonAsync(
                new
                {
                    succeeded = false,
                    code = result.Code,
                    message = result.Message
                },
                context.RequestAborted);

            return;
        }

        await _next(context);
    }

    private static bool IsUserIssue(AccountAccessStatus status) =>
        status is AccountAccessStatus.UserDeleted or AccountAccessStatus.UserInactive;
}

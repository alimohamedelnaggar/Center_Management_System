using CenterManagement.Data.AppMetaData;

namespace CenterManagement.Api.Middleware;

/// <summary>
/// Blocks every authenticated request while the account still uses its
/// temporary password. Only the endpoints needed to change it, leave, refresh
/// the session or read the caller's own profile stay reachable.
/// </summary>
public sealed class PasswordChangeEnforcementMiddleware
{
    private static readonly string[] AllowedPaths =
    [
        "/" + Routing.ProfileRouting.ChangePassword,
        "/" + Routing.ProfileRouting.GetMyProfile,
        "/" + Routing.Authentication.Logout,
        "/" + Routing.Authentication.RefreshToken,
        "/" + Routing.ImpersonationRouting.Stop,
    ];

    private readonly RequestDelegate _next;

    public PasswordChangeEnforcementMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        if (HttpMethods.IsOptions(context.Request.Method) ||
            context.User.Identity?.IsAuthenticated != true)
        {
            await _next(context);
            return;
        }

        var required = string.Equals(
            context.User.FindFirst(AppPolicies.PasswordChangeRequiredClaim)?.Value,
            AppPolicies.TrueValue,
            StringComparison.OrdinalIgnoreCase);

        if (!required || IsAllowed(context.Request.Path.Value))
        {
            await _next(context);
            return;
        }

        context.Response.StatusCode = StatusCodes.Status403Forbidden;
        context.Response.ContentType = "application/json; charset=utf-8";

        await context.Response.WriteAsJsonAsync(new
        {
            succeeded = false,
            statusCode = StatusCodes.Status403Forbidden,
            code = AppPolicies.PasswordChangeRequiredCode,
            message = "يجب تغيير كلمة المرور المؤقتة قبل استخدام النظام."
        });
    }

    private static bool IsAllowed(string? path)
    {
        if (string.IsNullOrEmpty(path))
            return false;

        foreach (var allowed in AllowedPaths)
        {
            if (string.Equals(path, allowed, StringComparison.OrdinalIgnoreCase))
                return true;
        }

        return false;
    }
}

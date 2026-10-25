using CenterManagement.Data.AppMetaData;
using CenterManagement.Data.Entities.Abstractions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace CenterManagement.Api.Authorization;

/// <summary>
/// Gates an endpoint behind a per-center feature module (see
/// <see cref="ModuleKeys"/>). When the caller's center does not have the module
/// enabled the request is short-circuited with HTTP 403 and code
/// <c>MODULE_DISABLED</c>. SuperAdmin (platform) callers are never gated.
/// Can be applied more than once (e.g. a student-portal action that also needs
/// the underlying attendance module) — every applied module must be enabled.
/// Anonymous endpoints must enforce their own modules in the handler and be
/// marked with <see cref="SelfModuleCheckedAttribute"/>.
/// </summary>
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method, AllowMultiple = true, Inherited = true)]
public sealed class RequireModuleAttribute : Attribute, IAsyncAuthorizationFilter
{
    public string ModuleKey { get; }

    public RequireModuleAttribute(string moduleKey) => ModuleKey = moduleKey;

    public async Task OnAuthorizationAsync(AuthorizationFilterContext context)
    {
        var http = context.HttpContext;

        // Anonymous endpoints (e.g. the public student card) check modules themselves.
        if (http.User?.Identity?.IsAuthenticated != true)
            return;

        // Platform operators are not tied to a center and are never gated.
        if (http.User.IsInRole(AppRoles.SuperAdmin))
            return;

        var tenant = http.RequestServices.GetRequiredService<ITenantContext>();
        var centerId = tenant.CenterId;

        // A platform user without a center is not gated by a center's modules.
        if (centerId is null)
            return;

        var modules = http.RequestServices.GetRequiredService<ICenterModuleService>();

        if (await modules.IsEnabledAsync(centerId.Value, ModuleKey, http.RequestAborted))
            return;

        context.Result = new ObjectResult(new
        {
            succeeded = false,
            code = ModuleAccessCodes.ModuleDisabled,
            message = ModuleAccessCodes.ModuleDisabledMessage,
            module = ModuleKey
        })
        {
            StatusCode = StatusCodes.Status403Forbidden
        };
    }
}

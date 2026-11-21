using System.Net;
using System.Net.Http.Json;
using CenterManagement.Data.AppMetaData;
using CenterManagement.Data.Entities.Abstractions;

namespace CenterManagement.Tests;

/// <summary>
/// The owner password-reset button calls Api/V1/User/Reset-Password. The route
/// constant used to omit the slash after "User", so the endpoint was registered
/// as Api/V1/UserReset-Password and every reset from the UI returned 404.
/// </summary>
[Collection("PasswordSecurity")]
public sealed class OwnerPasswordResetRouteTests
{
    private const string LegacyRoute = "Api/V1/UserReset-Password";

    [Fact]
    public void Route_constant_matches_the_client_path()
    {
        Assert.Equal(
            "Api/V1/User/Reset-Password",
            Routing.ApplicationUserRouting.ResetPassword);
    }

    [Fact]
    public async Task Reset_password_is_reachable_on_the_documented_path()
    {
        using var factory = new ScopeApiFactory();
        var seed = factory.EnsureSeeded();
        var userId = await CreateResetTargetAsync(factory, seed);
        using var admin = SecurityTestSupport.Client(
            factory, Guid.NewGuid(), AppRoles.SuperAdmin, seed.CenterA);

        var response = await admin.PostAsJsonAsync(
            Routing.ApplicationUserRouting.ResetPassword, new { userId });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task Old_route_is_gone()
    {
        using var factory = new ScopeApiFactory();
        var seed = factory.EnsureSeeded();
        var userId = await CreateResetTargetAsync(factory, seed);
        using var admin = SecurityTestSupport.Client(
            factory, Guid.NewGuid(), AppRoles.SuperAdmin, seed.CenterA);

        var response = await admin.PostAsJsonAsync(LegacyRoute, new { userId });

        // ASP.NET may report 405 instead of 404 for a URL that matches an
        // endpoint's path pattern with a different verb; both prove the old
        // POST route is no longer callable (mirrors PasswordResetSecurityTests).
        Assert.True(
            response.StatusCode is HttpStatusCode.NotFound or HttpStatusCode.MethodNotAllowed,
            $"Legacy reset route still responds {response.StatusCode}.");
    }

    private static Task<Guid> CreateResetTargetAsync(ScopeApiFactory factory, SeedResult seed)
    {
        var phone = "0109" + SecurityTestSupport.RandomDigits(7);
        return SecurityTestSupport.CreateUserAsync(
            factory,
            phone,
            $"{phone}@test.local",
            role: AppRoles.CenterOwner,
            centerId: seed.CenterA);
    }
}

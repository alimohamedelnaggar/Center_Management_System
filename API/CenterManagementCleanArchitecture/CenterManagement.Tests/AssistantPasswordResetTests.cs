using System.Net;
using CenterManagement.Infrustructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace CenterManagement.Tests;

/// <summary>
/// The replacement for the legacy open reset endpoint: a center admin resets an
/// assistant password by server-generating a one-time temporary password (never
/// supplied by the caller), forcing a change on next sign-in, and revoking the
/// target's refresh tokens — all limited to assistants inside the same center.
/// </summary>
[Collection("PasswordSecurity")]
public sealed class AssistantPasswordResetTests
{
    [Fact]
    public async Task Center_admin_resets_own_assistant_and_gets_temporary_password()
    {
        using var factory = new ScopeApiFactory();
        var seed = factory.EnsureSeeded();
        ScopeApiFactory.ClearSentEmails();
        await SecurityTestSupport.AddActiveRefreshTokenAsync(factory, seed.AssistantA);

        var client = SecurityTestSupport.CenterAdminClient(factory, seed.CenterOwnerA, seed.CenterA);

        var response = await client.PostAsync(
            SecurityTestSupport.AssistantResetPasswordRoute(seed.AssistantA),
            content: null);

        var body = await response.Content.ReadAsStringAsync();
        Assert.True(response.StatusCode == HttpStatusCode.OK,
            $"Expected 200 but got {response.StatusCode}. Body: {body}");

        var temporaryPassword = SecurityTestSupport.FindStringProperty(body, "temporaryPassword");
        Assert.False(string.IsNullOrWhiteSpace(temporaryPassword));
        Assert.True(temporaryPassword!.Length >= 6);

        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var assistant = await db.Users.SingleAsync(u => u.Id == seed.AssistantA);

        Assert.True(assistant.MustChangePassword);
        Assert.True(await SecurityTestSupport.CheckPasswordAsync(factory, seed.AssistantA, temporaryPassword));

        var tokens = await db.UserRefreshToken.Where(t => t.UserId == seed.AssistantA).ToListAsync();
        Assert.NotEmpty(tokens);
        Assert.All(tokens, token => Assert.True(token.IsRevoked));
    }

    [Fact]
    public async Task Center_admin_cannot_reset_an_assistant_from_another_center()
    {
        using var factory = new ScopeApiFactory();
        var seed = factory.EnsureSeeded();
        ScopeApiFactory.ClearSentEmails();

        var client = SecurityTestSupport.CenterAdminClient(factory, seed.CenterOwnerA, seed.CenterA);

        var response = await client.PostAsync(
            SecurityTestSupport.AssistantResetPasswordRoute(seed.AssistantB),
            content: null);

        Assert.True(
            response.StatusCode is HttpStatusCode.NotFound or HttpStatusCode.Forbidden,
            $"Expected 404/403 but got {response.StatusCode}.");
    }

    [Fact]
    public async Task Center_admin_cannot_reset_a_non_assistant_account()
    {
        using var factory = new ScopeApiFactory();
        var seed = factory.EnsureSeeded();
        ScopeApiFactory.ClearSentEmails();

        var client = SecurityTestSupport.CenterAdminClient(factory, seed.CenterOwnerA, seed.CenterA);

        var response = await client.PostAsync(
            SecurityTestSupport.AssistantResetPasswordRoute(seed.TeacherA),
            content: null);

        Assert.True(
            response.StatusCode is HttpStatusCode.NotFound or HttpStatusCode.BadRequest,
            $"Expected 404/400 but got {response.StatusCode}.");
    }
}

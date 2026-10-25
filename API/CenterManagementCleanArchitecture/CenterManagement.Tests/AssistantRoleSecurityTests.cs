using System.Net.Http.Json;
using CenterManagement.Data.AppMetaData;
using CenterManagement.Data.Entities.Identity;
using CenterManagement.Infrustructure.Data;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.DependencyInjection;

namespace CenterManagement.Tests;

/// <summary>
/// Group (A) finding #1: the "add assistant" endpoint used to trust the role
/// supplied in the request body, so a center admin could mint a SuperAdmin.
/// </summary>
[Collection("PasswordSecurity")]
public sealed class AssistantRoleSecurityTests
{
    [Theory]
    [InlineData("SuperAdmin")]
    [InlineData("CenterOwner")]
    [InlineData("Teacher")]
    [InlineData("Assistant")]
    public async Task Role_from_body_is_ignored_and_only_assistant_role_is_assigned(string requestedRole)
    {
        using var factory = new ScopeApiFactory();
        var seed = factory.EnsureSeeded();
        var client = SecurityTestSupport.CenterAdminClient(factory, seed.CenterOwnerA, seed.CenterA);

        var phone = "0109" + SecurityTestSupport.RandomDigits(7);

        var response = await client.PostAsJsonAsync(SecurityTestSupport.AssistantCreateRoute, new
        {
            fullName = "Assist Under Test",
            phoneNumber = phone,
            password = "Temp123!",
            confirmPassword = "Temp123!",
            salary = 1000,
            role = requestedRole
        });

        Assert.True(response.IsSuccessStatusCode, await response.Content.ReadAsStringAsync());

        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<User>>();

        var created = db.Users.Single(u => u.PhoneNumber == phone);
        var roles = await userManager.GetRolesAsync(created);

        Assert.Equal(new[] { AppRoles.Assistant }, roles.ToArray());
    }
}

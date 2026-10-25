using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using CenterManagement.Data.AppMetaData;
using CenterManagement.Data.Entities.Identity;
using CenterManagement.Data.Entities.Users;
using CenterManagement.Infrustructure.Data;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;

namespace CenterManagement.Tests;

/// <summary>
/// Guards the contract the frontend relies on: the auth payloads (SignIn,
/// Refresh-Token and GetMyProfile) must always expose <c>enabledModules</c> as a
/// JSON array of strings for every role — never null, never an object. A breach
/// here is exactly what blanked the teacher's page on the client.
/// </summary>
public sealed class AuthPayloadEnabledModulesShapeTests : IClassFixture<ScopeApiFactory>
{
    private const string Password = "Payload@123";

    private readonly ScopeApiFactory _factory;
    private readonly SeedResult _seed;

    public AuthPayloadEnabledModulesShapeTests(ScopeApiFactory factory)
    {
        _factory = factory;
        _seed = _factory.EnsureSeeded();

        SetPassword(_seed.TeacherA);
        SetPassword(_seed.AssistantA);
        SetPassword(_seed.CenterOwnerA);
    }

    [Theory]
    [InlineData("Teacher")]
    [InlineData("Assistant")]
    [InlineData("CenterOwner")]
    public async Task SignIn_Refresh_And_Me_Return_An_Array_For_Staff_Roles(string role)
    {
        var userId = role switch
        {
            "Teacher" => _seed.TeacherA,
            "Assistant" => _seed.AssistantA,
            _ => _seed.CenterOwnerA
        };

        await AssertArrayEverywhere(userId);
    }

    [Fact]
    public async Task SignIn_Refresh_And_Me_Return_An_Array_For_A_Student()
    {
        var userId = CreatePortalStudent(_seed.CenterA);
        SetPassword(userId);

        await AssertArrayEverywhere(userId, expectModulesLoaded: true);
    }

    private async Task AssertArrayEverywhere(Guid userId, bool expectModulesLoaded = true)
    {
        var client = AnonymousClient();

        // 1. SignIn — the client stores the refreshToken cookie automatically.
        var signIn = await client.PostAsJsonAsync(
            "Api/V1/Authentication/SignIn",
            new { phoneNumber = PhoneOf(userId), password = Password });

        Assert.Equal(HttpStatusCode.OK, signIn.StatusCode);

        using (var doc = JsonDocument.Parse(await signIn.Content.ReadAsStringAsync()))
        {
            AssertArray(doc.RootElement.GetProperty("enabledModules"), expectModulesLoaded);
        }

        // 2. Refresh-Token — driven by the cookie the SignIn above returned.
        var refresh = await client.PostAsync(
            "Api/V1/Authentication/Refresh-Token", content: null);

        Assert.Equal(HttpStatusCode.OK, refresh.StatusCode);

        string accessToken;
        using (var doc = JsonDocument.Parse(await refresh.Content.ReadAsStringAsync()))
        {
            var modules = doc.RootElement.GetProperty("enabledModules");
            AssertArray(modules, expectModulesLoaded);
            accessToken = doc.RootElement.GetProperty("accessToken").GetString()!;
        }

        // 3. GetMyProfile — same contract through the authenticated endpoint.
        var me = AnonymousClient();
        me.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", accessToken);

        var profile = await me.GetAsync("Api/V1/Profile/GetMyProfile");
        Assert.Equal(HttpStatusCode.OK, profile.StatusCode);

        using var profileDoc = JsonDocument.Parse(await profile.Content.ReadAsStringAsync());
        AssertArray(
            profileDoc.RootElement.GetProperty("data").GetProperty("enabledModules"),
            expectModulesLoaded);
    }

    private static void AssertArray(JsonElement modules, bool expectModulesLoaded)
    {
        Assert.Equal(JsonValueKind.Array, modules.ValueKind);

        foreach (var item in modules.EnumerateArray())
            Assert.Equal(JsonValueKind.String, item.ValueKind);

        if (expectModulesLoaded)
            Assert.Equal(ModuleKeys.All.Length, modules.GetArrayLength());
    }

    private Guid CreatePortalStudent(Guid centerId)
    {
        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var phone = "013" + (DateTime.UtcNow.Ticks % 100_000_000).ToString("D8");

        var user = new User
        {
            Id = Guid.NewGuid(),
            FullName = "Payload Portal Student",
            UserName = phone,
            PhoneNumber = phone,
            EmailConfirmed = true,
            CenterId = centerId
        };
        context.Users.Add(user);

        context.Students.Add(new Student
        {
            Id = Guid.NewGuid(),
            FullName = "Payload Portal Student",
            PhoneNumber = phone,
            ParentPhoneNumber = phone,
            CenterId = centerId,
            UserId = user.Id
        });

        context.SaveChanges();
        return user.Id;
    }

    private HttpClient AnonymousClient() =>
        _factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            BaseAddress = new Uri("https://localhost"),
            AllowAutoRedirect = false
        });

    private string PhoneOf(Guid userId)
    {
        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        return context.Users.First(u => u.Id == userId).PhoneNumber!;
    }

    private void SetPassword(Guid userId)
    {
        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var hasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher<User>>();

        var user = context.Users.First(u => u.Id == userId);
        user.PasswordHash = hasher.HashPassword(user, Password);
        context.SaveChanges();
    }
}

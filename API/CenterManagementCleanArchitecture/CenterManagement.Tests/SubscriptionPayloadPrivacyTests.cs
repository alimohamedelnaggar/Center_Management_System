using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Net.Http.Headers;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using CenterManagement.Data.AppMetaData;
using CenterManagement.Data.Entities.Abstractions;
using CenterManagement.Data.Entities.Identity;
using CenterManagement.Infrustructure.Data;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;

namespace CenterManagement.Tests;

/// <summary>
/// Proves the billing snapshot stays private: only the center owner / solo
/// teacher receives the subscription object from the auth payloads. A regular
/// teacher, an assistant and a student must get no dates, state or prices —
/// neither in the UI nor in the API response.
/// </summary>
public sealed class SubscriptionPayloadPrivacyTests : IClassFixture<ScopeApiFactory>
{
    private readonly ScopeApiFactory _factory;
    private readonly SeedResult _seed;

    public SubscriptionPayloadPrivacyTests(ScopeApiFactory factory)
    {
        _factory = factory;
        _seed = _factory.EnsureSeeded();
    }

    [Theory]
    [InlineData(AppRoles.Teacher)]
    [InlineData(AppRoles.Assistant)]
    public async Task GetMyProfile_Hides_Subscription_For_Non_Billing_Roles(string role)
    {
        var subject = role == AppRoles.Teacher ? _seed.TeacherA : _seed.AssistantA;

        await AssertNoSubscription(subject, role);
    }

    [Fact]
    public async Task GetMyProfile_Hides_Subscription_For_Student()
    {
        // A student logs in with a User account linked to a Student row in the
        // same center (mirrors the portal login path).
        var studentUserId = CreatePortalStudent(_seed.CenterA);

        await AssertNoSubscription(studentUserId, AppRoles.Student);
    }

    private async Task AssertNoSubscription(Guid subject, string role)
    {
        var response = await Client(subject, role, isCenterAdmin: false)
            .GetAsync("Api/V1/Profile/GetMyProfile");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var raw = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(raw);
        var data = doc.RootElement.GetProperty("data");

        if (data.TryGetProperty("subscription", out var subscription))
            Assert.Equal(JsonValueKind.Null, subscription.ValueKind);

        // No billing vocabulary may leak into a non-billing payload.
        Assert.DoesNotContain("price", raw, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("paidAmount", raw, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("endDate", raw, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task GetMyProfile_Returns_Subscription_For_Billing_Viewer()
    {
        // SoloTeacherA owns his center (IsCenterAdmin == true), so he is a
        // billing viewer and must see the subscription snapshot.
        var response = await Client(_seed.SoloTeacherA, AppRoles.Teacher, isCenterAdmin: true)
            .GetAsync("Api/V1/Profile/GetMyProfile");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var data = doc.RootElement.GetProperty("data");

        var subscription = data.GetProperty("subscription");
        Assert.NotEqual(JsonValueKind.Null, subscription.ValueKind);
        Assert.True(subscription.TryGetProperty("state", out _));
    }

    [Fact]
    public async Task GetMyProfile_Always_Returns_EnabledModules_For_Center_Users()
    {
        var response = await Client(_seed.TeacherA, AppRoles.Teacher, isCenterAdmin: false)
            .GetAsync("Api/V1/Profile/GetMyProfile");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var modules = doc.RootElement.GetProperty("data").GetProperty("enabledModules");

        Assert.Equal(JsonValueKind.Array, modules.ValueKind);
        Assert.Equal(ModuleKeys.All.Length, modules.GetArrayLength());
    }

    private Guid CreatePortalStudent(Guid centerId)
    {
        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var phone = "011" + (DateTime.UtcNow.Ticks % 100_000_000).ToString("D8");

        var user = new User
        {
            Id = Guid.NewGuid(),
            FullName = "Privacy Portal Student",
            UserName = phone,
            PhoneNumber = phone,
            EmailConfirmed = true,
            CenterId = centerId
        };
        context.Users.Add(user);

        context.Students.Add(new CenterManagement.Data.Entities.Users.Student
        {
            Id = Guid.NewGuid(),
            FullName = "Privacy Portal Student",
            PhoneNumber = phone,
            ParentPhoneNumber = phone,
            CenterId = centerId,
            UserId = user.Id
        });

        context.SaveChanges();
        return user.Id;
    }

    private HttpClient Client(Guid subjectUserId, string role, bool isCenterAdmin)
    {
        var client = _factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            BaseAddress = new Uri("https://localhost"),
            AllowAutoRedirect = false
        });

        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(
            "Bearer",
            CreateToken(subjectUserId, role, _seed.CenterA, isCenterAdmin));

        return client;
    }

    private static string CreateToken(Guid userId, string role, Guid centerId, bool isCenterAdmin)
    {
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, userId.ToString()),
            new("Id", userId.ToString()),
            new(ClaimTypes.Role, role),
            new(TenantClaimTypes.CenterId, centerId.ToString())
        };

        if (isCenterAdmin)
            claims.Add(new Claim(AppPolicies.IsCenterAdminClaim, AppPolicies.TrueValue));

        var credentials = new SigningCredentials(
            new SymmetricSecurityKey(Encoding.UTF8.GetBytes(ScopeApiFactory.JwtSecret)),
            SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: "CenterManagement",
            audience: "WebSite",
            claims: claims,
            expires: DateTime.UtcNow.AddHours(1),
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}

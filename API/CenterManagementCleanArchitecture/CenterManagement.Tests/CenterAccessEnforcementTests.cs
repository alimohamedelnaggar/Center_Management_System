using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Text;
using CenterManagement.Data.AppMetaData;
using CenterManagement.Data.Entities;
using CenterManagement.Data.Entities.Abstractions;
using CenterManagement.Data.Entities.Identity;
using CenterManagement.Data.Enums;
using CenterManagement.Infrustructure.Data;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;

namespace CenterManagement.Tests;

/// <summary>
/// Proves the center/account access rules are enforced both at sign-in and on
/// every authenticated request (so a suspension takes effect immediately, even
/// for an already-issued token).
/// </summary>
public sealed class CenterAccessEnforcementTests : IClassFixture<ScopeApiFactory>
{
    private const string Password = "Password@123";

    private readonly ScopeApiFactory _factory;
    private readonly SeedResult _seed;

    public CenterAccessEnforcementTests(ScopeApiFactory factory)
    {
        _factory = factory;
        _seed = _factory.EnsureSeeded();
        SetPassword(_seed.TeacherA);
    }

    [Fact]
    public async Task SignIn_Is_Blocked_When_Center_Is_Suspended()
    {
        UpdateCenter(_seed.CenterA, c => c.Status = CenterStatus.Suspended);

        var response = await AnonymousClient().PostAsJsonAsync(
            "Api/V1/Authentication/SignIn",
            new { phoneNumber = PhoneOf(_seed.TeacherA), password = Password });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains(AccountAccessCodes.CenterSuspended, body);
    }

    [Fact]
    public async Task Existing_Token_Is_Blocked_When_Center_Is_Suspended()
    {
        UpdateCenter(_seed.CenterA, c => c.Status = CenterStatus.Suspended);

        var response = await StaffClient(_seed.TeacherA, AppRoles.Teacher)
            .GetAsync("Api/V1/Student/Paginated?PageIndex=1&PageSize=10");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);

        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains(AccountAccessCodes.CenterSuspended, body);
    }

    [Fact]
    public async Task Existing_Token_Is_Blocked_When_Subscription_Is_Expired()
    {
        UpdateCenter(_seed.CenterA, c =>
        {
            c.Status = CenterStatus.Active;
            c.SubscriptionEnd = DateTime.UtcNow.AddDays(-1);
            c.GraceDays = 0;
        });

        var response = await StaffClient(_seed.TeacherA, AppRoles.Teacher)
            .GetAsync("Api/V1/Student/Paginated?PageIndex=1&PageSize=10");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);

        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains(AccountAccessCodes.CenterExpired, body);
    }

    [Fact]
    public async Task SignIn_Is_Blocked_When_User_Is_Deleted()
    {
        SetPassword(_seed.TeacherB);
        UpdateUser(_seed.TeacherB, u => u.IsDeleted = true);

        var response = await AnonymousClient().PostAsJsonAsync(
            "Api/V1/Authentication/SignIn",
            new { phoneNumber = PhoneOf(_seed.TeacherB), password = Password });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains(AccountAccessCodes.UserDeleted, body);
    }

    [Fact]
    public async Task Existing_Token_Is_Blocked_When_User_Is_Deleted()
    {
        UpdateUser(_seed.TeacherB, u => u.IsDeleted = true);

        var response = await StaffClient(_seed.TeacherB, AppRoles.Teacher)
            .GetAsync("Api/V1/Student/Paginated?PageIndex=1&PageSize=10");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);

        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains(AccountAccessCodes.UserDeleted, body);
    }

    private HttpClient AnonymousClient() =>
        _factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            BaseAddress = new Uri("https://localhost"),
            AllowAutoRedirect = false
        });

    private HttpClient StaffClient(Guid userId, string role)
    {
        var client = AnonymousClient();
        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", CreateToken(userId, role, _seed.CenterA));
        return client;
    }

    private static string CreateToken(Guid userId, string role, Guid centerId)
    {
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, userId.ToString()),
            new Claim(ClaimTypes.Role, role),
            new Claim(TenantClaimTypes.CenterId, centerId.ToString())
        };

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

    private void UpdateCenter(Guid centerId, Action<Center> mutate)
    {
        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var center = context.Centers.First(c => c.Id == centerId);
        mutate(center);
        context.SaveChanges();
    }

    private void UpdateUser(Guid userId, Action<User> mutate)
    {
        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var user = context.Users.First(u => u.Id == userId);
        mutate(user);
        context.SaveChanges();
    }
}

using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Net.Http.Headers;
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
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;

namespace CenterManagement.Tests;

/// <summary>
/// End-to-end grace/expiry enforcement using a controllable clock: the same
/// center with the same data is allowed on the last day of grace and blocked the
/// next day, with no waiting. Also covers GraceDays=0, Lifetime and suspension.
/// </summary>
public sealed class GracePeriodEnforcementTests : IClassFixture<TimeControlledApiFactory>
{
    private const string Password = "Password@123";

    private readonly TimeControlledApiFactory _factory;
    private readonly SeedResult _seed;

    public GracePeriodEnforcementTests(TimeControlledApiFactory factory)
    {
        _factory = factory;
        _seed = _factory.EnsureSeeded();
        SetPassword(_seed.TeacherA);
    }

    [Fact]
    public async Task Last_Day_Of_Grace_Is_Allowed_Then_Next_Day_Blocked()
    {
        // Clock = 2026-08-15. end = 2026-08-12, grace = 3 -> grace ends 2026-08-15.
        ResetCenter(_seed.CenterA, status: CenterStatus.Active, end: new DateTime(2026, 8, 12, 0, 0, 0, DateTimeKind.Utc), graceDays: 3);
        _factory.Clock.SetUtcNow(new DateTimeOffset(2026, 8, 15, 9, 0, 0, TimeSpan.Zero));

        var allowed = await StaffClient(_seed.TeacherA, AppRoles.Teacher)
            .GetAsync("Api/V1/Student/Paginated?PageIndex=1&PageSize=10");

        Assert.Equal(HttpStatusCode.OK, allowed.StatusCode);

        // Move only the clock forward one day: same data, now past grace.
        _factory.Clock.Advance(TimeSpan.FromDays(1));

        var blocked = await StaffClient(_seed.TeacherA, AppRoles.Teacher)
            .GetAsync("Api/V1/Student/Paginated?PageIndex=1&PageSize=10");

        Assert.Equal(HttpStatusCode.Forbidden, blocked.StatusCode);
        Assert.Contains(AccountAccessCodes.CenterExpired, await blocked.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task GraceDays_Zero_Blocks_Immediately_After_End()
    {
        ResetCenter(_seed.CenterA, status: CenterStatus.Active, end: new DateTime(2026, 8, 14, 0, 0, 0, DateTimeKind.Utc), graceDays: 0);
        _factory.Clock.SetUtcNow(new DateTimeOffset(2026, 8, 15, 9, 0, 0, TimeSpan.Zero));

        var response = await StaffClient(_seed.TeacherA, AppRoles.Teacher)
            .GetAsync("Api/V1/Student/Paginated?PageIndex=1&PageSize=10");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        Assert.Contains(AccountAccessCodes.CenterExpired, await response.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task Lifetime_Is_Never_Blocked()
    {
        ResetCenter(_seed.CenterA, status: CenterStatus.Active, end: null, graceDays: 0);
        // Move the clock far into the future; Lifetime must never expire.
        _factory.Clock.SetUtcNow(new DateTimeOffset(2035, 1, 1, 0, 0, 0, TimeSpan.Zero));

        var response = await StaffClient(_seed.TeacherA, AppRoles.Teacher)
            .GetAsync("Api/V1/Student/Paginated?PageIndex=1&PageSize=10");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task Suspended_During_Grace_Is_Blocked_Immediately()
    {
        // Inside the grace window, but suspended -> no grace applies.
        ResetCenter(_seed.CenterA, status: CenterStatus.Suspended, end: new DateTime(2026, 8, 12, 0, 0, 0, DateTimeKind.Utc), graceDays: 3);
        _factory.Clock.SetUtcNow(new DateTimeOffset(2026, 8, 15, 9, 0, 0, TimeSpan.Zero));

        var response = await StaffClient(_seed.TeacherA, AppRoles.Teacher)
            .GetAsync("Api/V1/Student/Paginated?PageIndex=1&PageSize=10");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        Assert.Contains(AccountAccessCodes.CenterSuspended, await response.Content.ReadAsStringAsync());
    }

    private HttpClient StaffClient(Guid userId, string role)
    {
        var client = _factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            BaseAddress = new Uri("https://localhost"),
            AllowAutoRedirect = false
        });

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

    private void SetPassword(Guid userId)
    {
        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var hasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher<User>>();

        var user = context.Users.First(u => u.Id == userId);
        user.PasswordHash = hasher.HashPassword(user, Password);
        context.SaveChanges();
    }

    private void ResetCenter(Guid centerId, CenterStatus status, DateTime? end, int graceDays)
    {
        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var center = context.Centers.IgnoreQueryFilters().First(c => c.Id == centerId);
        center.Status = status;
        center.IsActive = true;
        center.SubscriptionEnd = end;
        center.GraceDays = graceDays;
        context.SaveChanges();
    }
}

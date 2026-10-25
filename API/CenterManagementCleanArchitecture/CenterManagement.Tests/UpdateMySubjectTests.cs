using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Net.Http.Headers;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using CenterManagement.Data.AppMetaData;
using CenterManagement.Data.Entities.Abstractions;
using CenterManagement.Infrustructure.Data;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;

namespace CenterManagement.Tests;

/// <summary>
/// Proves a teacher can set the subject on his own teacher profile from the
/// profile screen, and that nobody else can touch it.
/// </summary>
public sealed class UpdateMySubjectTests : IClassFixture<ScopeApiFactory>
{
    private const string Route = "Api/V1/Profile/EditMyProfile";

    private readonly ScopeApiFactory _factory;
    private readonly SeedResult _seed;

    public UpdateMySubjectTests(ScopeApiFactory factory)
    {
        _factory = factory;
        _seed = _factory.EnsureSeeded();
    }

    [Fact]
    public async Task Teacher_Can_Set_Own_Subject()
    {
        var teacherId = await SecurityTestSupport.CreateUserAsync(
            _factory,
            Phone(),
            Email(),
            role: AppRoles.Teacher,
            centerId: _seed.CenterA);

        var response = await Client(teacherId, AppRoles.Teacher)
            .PutAsync(Route, Json(new { subject = "الرياضيات" }));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("الرياضيات", await ReadSubjectAsync(teacherId));
    }

    [Fact]
    public async Task Teacher_Update_Overwrites_Existing_Subject()
    {
        var teacherId = await SecurityTestSupport.CreateUserAsync(
            _factory, Phone(), Email(), role: AppRoles.Teacher, centerId: _seed.CenterA);

        await Client(teacherId, AppRoles.Teacher)
            .PutAsync(Route, Json(new { subject = "الفيزياء" }));

        var response = await Client(teacherId, AppRoles.Teacher)
            .PutAsync(Route, Json(new { subject = "الكيمياء" }));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("الكيمياء", await ReadSubjectAsync(teacherId));
    }

    [Fact]
    public async Task NonTeacher_Cannot_Set_Subject()
    {
        var assistantId = await SecurityTestSupport.CreateUserAsync(
            _factory, Phone(), Email(), role: AppRoles.Assistant, centerId: _seed.CenterA);

        var response = await Client(assistantId, AppRoles.Assistant)
            .PutAsync(Route, Json(new { subject = "الرياضيات" }));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Null(await ReadSubjectAsync(assistantId));
    }

    [Fact]
    public async Task Empty_Subject_Is_Rejected()
    {
        var teacherId = await SecurityTestSupport.CreateUserAsync(
            _factory, Phone(), Email(), role: AppRoles.Teacher, centerId: _seed.CenterA);

        // The FluentValidation pipeline rejects a blank subject before the
        // handler runs, so nothing is persisted.
        await Assert.ThrowsAsync<FluentValidation.ValidationException>(() =>
            Client(teacherId, AppRoles.Teacher)
                .PutAsync(Route, Json(new { subject = "   " })));

        Assert.Null(await ReadSubjectAsync(teacherId));
    }

    [Fact]
    public async Task Missing_Token_Is_Unauthorized()
    {
        var client = _factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            BaseAddress = new Uri("https://localhost"),
            AllowAutoRedirect = false
        });

        var response = await client.PutAsync(Route, Json(new { subject = "الرياضيات" }));

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    private async Task<string?> ReadSubjectAsync(Guid userId)
    {
        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        return await context.TeacherProfiles
            .Where(tp => tp.UserId == userId)
            .Select(tp => tp.Subject)
            .FirstOrDefaultAsync();
    }

    private HttpClient Client(Guid userId, string role)
    {
        var client = _factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            BaseAddress = new Uri("https://localhost"),
            AllowAutoRedirect = false
        });

        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(
            "Bearer",
            CreateToken(userId, role, _seed.CenterA));

        return client;
    }

    private static string CreateToken(Guid userId, string role, Guid centerId)
    {
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, userId.ToString()),
            new("Id", userId.ToString()),
            new(ClaimTypes.Role, role),
            new(TenantClaimTypes.CenterId, centerId.ToString())
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

    private static StringContent Json(object value) =>
        new(JsonSerializer.Serialize(value), Encoding.UTF8, "application/json");

    private static string Phone() =>
        "011" + (DateTime.UtcNow.Ticks % 100_000_000).ToString("D8");

    private static string Email() =>
        $"subject_{Guid.NewGuid():N}@example.com";
}

using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Text;
using CenterManagement.Data.AppMetaData;
using CenterManagement.Data.Entities.Abstractions;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.IdentityModel.Tokens;

namespace CenterManagement.Tests;

/// <summary>
/// Endpoint-level integration tests that go through the real HTTP pipeline,
/// authorization policies and scoping handlers to prove a teacher can neither
/// touch another teacher's group nor an assistant see students outside the
/// teacher they are linked to.
/// </summary>
public sealed class ScopeApiEndpointTests : IClassFixture<ScopeApiFactory>
{
    private readonly ScopeApiFactory _factory;
    private readonly SeedResult _seed;

    public ScopeApiEndpointTests(ScopeApiFactory factory)
    {
        _factory = factory;
        _seed = _factory.EnsureSeeded();
    }

    [Fact]
    public async Task Teacher_Cannot_Edit_Group_Owned_By_Another_Teacher()
    {
        var client = CreateClient(_seed.TeacherA, AppRoles.Teacher, _seed.CenterA);

        var response = await client.PutAsJsonAsync("Api/V1/Group/Edit", new
        {
            id = _seed.GroupB,
            name = "hijacked",
            monthlyPrice = 0,
            sessionsPerMonth = 8
        });

        // Group management is CenterAdmin only, so a regular teacher is
        // rejected by the policy before scoping is even evaluated.
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Teacher_Cannot_Delete_Group_Owned_By_Another_Teacher()
    {
        var client = CreateClient(_seed.TeacherA, AppRoles.Teacher, _seed.CenterA);

        var response = await client.DeleteAsync($"Api/V1/Group/delete/{_seed.GroupB}");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Assistant_Linked_To_TeacherA_Cannot_See_TeacherB_Students()
    {
        var client = CreateClient(_seed.AssistantA, AppRoles.Assistant, _seed.CenterA);

        var response = await client.GetAsync("Api/V1/Student/Paginated?PageIndex=1&PageSize=50");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var payload = await response.Content.ReadAsStringAsync();

        Assert.Contains(_seed.StudentA.ToString(), payload);
        Assert.DoesNotContain(_seed.StudentB.ToString(), payload);
    }

    private HttpClient CreateClient(Guid userId, string role, Guid centerId)
    {
        var client = _factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            BaseAddress = new Uri("https://localhost"),
            AllowAutoRedirect = false
        });

        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", CreateToken(userId, role, centerId));

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
            expires: DateTime.UtcNow.AddHours(2),
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}

using System.Net;
using CenterManagement.Api.RateLimiting;
using CenterManagement.Infrustructure.Data;
using Microsoft.AspNetCore.Hosting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace CenterManagement.Tests;

/// <summary>
/// Regression tests for <see cref="StudentCardRateLimitingMiddleware"/>. They
/// drive the real HTTP pipeline against the public student-card endpoint and
/// prove the three budgets (per IP, per code, per IP for misses), the shared
/// response for an unknown and an inactive student, and the window reset. Each
/// test owns its host so the limiters start empty, and every client IP is
/// supplied through <c>X-Forwarded-For</c> (the app trusts the proxy header).
/// </summary>
public sealed class StudentCardRateLimitTests
{
    private const string Route = "Api/V1/StudentCard/by-code";
    private const string Alphabet = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

    [Fact]
    public async Task Repeated_Misses_From_One_Ip_Are_Throttled_With_429()
    {
        using var factory = new ScopeApiFactory();
        factory.EnsureSeeded();
        var client = factory.CreateClient();
        const string ip = "203.0.113.10";

        for (var i = 0; i < StudentCardRateLimitingMiddleware.MissPermitLimit; i++)
        {
            using var allowed = await GetCardAsync(client, WellFormedCode(i), ip);
            Assert.Equal(HttpStatusCode.NotFound, allowed.StatusCode);
        }

        using var rejected = await GetCardAsync(client, WellFormedCode(99), ip);

        Assert.Equal(HttpStatusCode.TooManyRequests, rejected.StatusCode);
        Assert.True(rejected.Headers.Contains("Retry-After"));
        Assert.Contains("محاولات", await rejected.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task Repeated_Requests_For_One_Code_Are_Throttled_With_429()
    {
        using var factory = new ScopeApiFactory();
        var seed = factory.EnsureSeeded();
        var code = await SetCodeAsync(factory, seed.StudentA);
        var client = factory.CreateClient();
        const string ip = "203.0.113.11";

        for (var i = 0; i < StudentCardRateLimitingMiddleware.CodePermitLimit; i++)
        {
            using var allowed = await GetCardAsync(client, code, ip);
            Assert.Equal(HttpStatusCode.OK, allowed.StatusCode);
        }

        using var rejected = await GetCardAsync(client, code, ip);

        Assert.Equal(HttpStatusCode.TooManyRequests, rejected.StatusCode);
        Assert.True(rejected.Headers.Contains("Retry-After"));
    }

    [Fact]
    public async Task One_Ip_Is_Throttled_After_Thirty_Requests_Even_With_Distinct_Codes()
    {
        // Widen the code and miss budgets so the per-IP limiter is the only one
        // that can fire in this scenario.
        using var factory = new RateLimitedCardFactory(
            ("RateLimiting:StudentCard:MissPermitLimit", "1000"),
            ("RateLimiting:StudentCard:CodePermitLimit", "1000"));
        factory.EnsureSeeded();
        var client = factory.CreateClient();
        const string ip = "203.0.113.12";

        for (var i = 0; i < StudentCardRateLimitingMiddleware.IpPermitLimit; i++)
        {
            using var allowed = await GetCardAsync(client, WellFormedCode(i), ip);
            Assert.Equal(HttpStatusCode.NotFound, allowed.StatusCode);
        }

        using var rejected = await GetCardAsync(
            client,
            WellFormedCode(StudentCardRateLimitingMiddleware.IpPermitLimit),
            ip);

        Assert.Equal(HttpStatusCode.TooManyRequests, rejected.StatusCode);
    }

    [Fact]
    public async Task Exhausting_One_Ip_Does_Not_Affect_Another_Ip()
    {
        using var factory = new ScopeApiFactory();
        factory.EnsureSeeded();
        var client = factory.CreateClient();

        for (var i = 0; i < StudentCardRateLimitingMiddleware.MissPermitLimit; i++)
            (await GetCardAsync(client, WellFormedCode(i), "203.0.113.20")).Dispose();

        using var blocked = await GetCardAsync(client, WellFormedCode(90), "203.0.113.20");
        Assert.Equal(HttpStatusCode.TooManyRequests, blocked.StatusCode);

        using var otherIp = await GetCardAsync(client, WellFormedCode(91), "203.0.113.21");
        Assert.Equal(HttpStatusCode.NotFound, otherIp.StatusCode);
    }

    [Fact]
    public async Task Inactive_Student_And_Unknown_Code_Share_The_Same_Response()
    {
        using var factory = new ScopeApiFactory();
        var seed = factory.EnsureSeeded();
        var inactiveCode = await SetCodeAsync(
            factory,
            seed.StudentA,
            isActive: false);
        var client = factory.CreateClient();

        using var inactive = await GetCardAsync(client, inactiveCode, "203.0.113.30");
        var inactiveBody = await inactive.Content.ReadAsStringAsync();

        using var unknown = await GetCardAsync(client, WellFormedCode(7), "203.0.113.31");
        var unknownBody = await unknown.Content.ReadAsStringAsync();

        Assert.Equal(HttpStatusCode.NotFound, inactive.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, unknown.StatusCode);
        Assert.Equal(inactiveBody, unknownBody);
        Assert.Contains("مفيش طالب", inactiveBody);
    }

    [Fact]
    public async Task Miss_Budget_Resets_After_The_Window()
    {
        using var factory = new RateLimitedCardFactory(
            ("RateLimiting:StudentCard:MissPermitLimit", "2"),
            ("RateLimiting:StudentCard:WindowSeconds", "1"),
            ("RateLimiting:StudentCard:IpPermitLimit", "1000"),
            ("RateLimiting:StudentCard:CodePermitLimit", "1000"));
        factory.EnsureSeeded();
        var client = factory.CreateClient();
        const string ip = "203.0.113.40";

        for (var i = 0; i < 2; i++)
            (await GetCardAsync(client, WellFormedCode(i), ip)).Dispose();

        using var rejected = await GetCardAsync(client, WellFormedCode(2), ip);
        Assert.Equal(HttpStatusCode.TooManyRequests, rejected.StatusCode);

        await Task.Delay(TimeSpan.FromMilliseconds(1300));

        using var afterWindow = await GetCardAsync(client, WellFormedCode(3), ip);
        Assert.Equal(HttpStatusCode.NotFound, afterWindow.StatusCode);
    }

    [Fact]
    public async Task A_Valid_Card_Still_Renders_Through_The_Limiter()
    {
        using var factory = new ScopeApiFactory();
        var seed = factory.EnsureSeeded();
        var code = await SetCodeAsync(factory, seed.StudentA);
        var client = factory.CreateClient();

        using var response = await GetCardAsync(client, code, "203.0.113.50");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Contains("Student A", await response.Content.ReadAsStringAsync());
    }

    private static async Task<HttpResponseMessage> GetCardAsync(
        HttpClient client,
        string code,
        string ip)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, $"{Route}/{code}");
        request.Headers.Add("X-Forwarded-For", ip);
        return await client.SendAsync(request);
    }

    private static async Task<string> SetCodeAsync(
        ScopeApiFactory factory,
        Guid studentId,
        bool isActive = true)
    {
        var code = "STU" + Guid.NewGuid().ToString("N")[..8].ToUpperInvariant();

        using var scope = factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var student = await context.Students.FirstAsync(x => x.Id == studentId);

        student.QrCode = code;
        student.IsActive = isActive;
        await context.SaveChangesAsync();

        return code;
    }

    /// <summary>
    /// A distinct code that passes <c>StudentQrCodeGenerator.IsValid</c>, so it
    /// gets its own per-code bucket instead of the shared invalid-code one.
    /// </summary>
    private static string WellFormedCode(int index)
    {
        var chars = new char[8];
        var value = index;

        for (var i = chars.Length - 1; i >= 0; i--)
        {
            chars[i] = Alphabet[value % Alphabet.Length];
            value /= Alphabet.Length;
        }

        return "STU" + new string(chars);
    }

    private sealed class RateLimitedCardFactory : ScopeApiFactory
    {
        private readonly (string Key, string Value)[] _settings;

        public RateLimitedCardFactory(params (string Key, string Value)[] settings)
        {
            _settings = settings;
        }

        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            base.ConfigureWebHost(builder);

            foreach (var (key, value) in _settings)
                builder.UseSetting(key, value);
        }
    }
}

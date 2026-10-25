using System.Net;
using System.Net.Http.Json;
using CenterManagement.Api.RateLimiting;

namespace CenterManagement.Tests;

/// <summary>
/// Regression tests for <see cref="SignInRateLimitingMiddleware"/>. They drive
/// the real HTTP pipeline and assert that repeated sign-in attempts are
/// throttled both per phone number and per client IP, and rejected with 429 and
/// an Arabic message. Each test owns its host so the limiter starts empty.
/// </summary>
public sealed class SignInRateLimitTests
{
    private const string SignInRoute = "Api/V1/Authentication/SignIn";

    [Fact]
    public async Task Repeated_SignIn_For_Same_Phone_Is_Throttled_With_429()
    {
        using var factory = new ScopeApiFactory();
        var client = factory.CreateClient();

        var attempts = SignInRateLimitingMiddleware.UserPermitLimit + 3;
        HttpResponseMessage? rejected = null;

        for (var i = 0; i < attempts; i++)
        {
            var response = await client.PostAsJsonAsync(SignInRoute, new
            {
                phoneNumber = "01000000999",
                password = "wrong-password"
            });

            if (response.StatusCode == HttpStatusCode.TooManyRequests)
            {
                rejected = response;
                break;
            }
        }

        Assert.NotNull(rejected);

        var message = await rejected!.Content.ReadAsStringAsync();
        Assert.Contains("محاولات", message);
    }

    [Fact]
    public async Task Throttle_Is_Per_Phone_Number_Not_Global()
    {
        using var factory = new ScopeApiFactory();
        var client = factory.CreateClient();

        // Exhaust the budget for phone A.
        for (var i = 0; i < SignInRateLimitingMiddleware.UserPermitLimit + 1; i++)
        {
            await client.PostAsJsonAsync(SignInRoute, new
            {
                phoneNumber = "01000000001",
                password = "wrong-password"
            });
        }

        // A different phone (same IP, well under the IP cap) must still be served.
        var other = await client.PostAsJsonAsync(SignInRoute, new
        {
            phoneNumber = "01000000002",
            password = "wrong-password"
        });

        Assert.NotEqual(HttpStatusCode.TooManyRequests, other.StatusCode);
    }

    [Fact]
    public async Task SignIn_Is_Throttled_Per_Ip_For_Many_Distinct_Phones()
    {
        using var factory = new ScopeApiFactory();
        var client = factory.CreateClient();

        HttpStatusCode lastStatus = HttpStatusCode.OK;
        var attempts = SignInRateLimitingMiddleware.IpPermitLimit + 5;

        for (var i = 0; i < attempts; i++)
        {
            var response = await client.PostAsJsonAsync(SignInRoute, new
            {
                phoneNumber = $"0100000{i:D4}",
                password = "wrong-password"
            });

            lastStatus = response.StatusCode;

            if (lastStatus == HttpStatusCode.TooManyRequests)
                break;
        }

        Assert.Equal(HttpStatusCode.TooManyRequests, lastStatus);
    }
}

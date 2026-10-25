using System.Net;
using System.Net.Http.Json;
using CenterManagement.Data.AppMetaData;
using CenterManagement.Infrustructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace CenterManagement.Tests;

/// <summary>
/// Group (A) finding #2: anyone could POST a phone number + new password to the
/// old reset endpoint and take over any account (including SuperAdmin) without
/// proving ownership of the account. These tests pin the replacement contract:
/// a code sent out-of-band is required, single use, expiring, attempt limited,
/// and the legacy endpoint no longer exists.
/// </summary>
[Collection("PasswordSecurity")]
public sealed class PasswordResetSecurityTests
{
    private const string NewPassword = "BrandNew123!";

    private static (ScopeApiFactory Factory, HttpClient Client) NewAnonymousContext()
    {
        var factory = new ScopeApiFactory();
        ScopeApiFactory.ClearSentEmails();
        return (factory, factory.CreateClient());
    }

    [Fact]
    public async Task Legacy_reset_endpoint_is_gone()
    {
        var (factory, client) = NewAnonymousContext();
        using (factory)
        {
            var seed = factory.EnsureSeeded();
            var phone = "0109" + SecurityTestSupport.RandomDigits(7);
            var userId = await SecurityTestSupport.CreateUserAsync(factory, phone, $"{phone}@test.local",
                centerId: seed.CenterA);

            var response = await client.PostAsJsonAsync(SecurityTestSupport.OldResetPasswordRoute, new
            {
                phoneNumber = phone,
                password = NewPassword,
                confirmPassword = NewPassword
            });

            Assert.True(
                response.StatusCode is HttpStatusCode.NotFound or HttpStatusCode.MethodNotAllowed,
                $"Legacy reset endpoint still responds {response.StatusCode}.");

            Assert.True(await SecurityTestSupport.CheckPasswordAsync(factory, userId, "OldPass123!"));
        }
    }

    [Fact]
    public async Task Reset_without_code_is_rejected()
    {
        var (factory, client) = NewAnonymousContext();
        using (factory)
        {
            var seed = factory.EnsureSeeded();
            var phone = "0109" + SecurityTestSupport.RandomDigits(7);
            await SecurityTestSupport.CreateUserAsync(factory, phone, $"{phone}@test.local", centerId: seed.CenterA);

            var response = await client.PostAsJsonAsync(SecurityTestSupport.ResetPasswordRoute, new
            {
                phoneNumber = phone,
                password = NewPassword,
                confirmPassword = NewPassword
            });

            Assert.True(
                response.StatusCode is HttpStatusCode.BadRequest or HttpStatusCode.UnprocessableEntity,
                $"Missing code must be rejected, got {response.StatusCode}.");
        }
    }

    [Fact]
    public async Task Wrong_code_is_rejected_and_password_is_unchanged()
    {
        var (factory, client) = NewAnonymousContext();
        using (factory)
        {
            var seed = factory.EnsureSeeded();
            var phone = "0109" + SecurityTestSupport.RandomDigits(7);
            var email = $"{phone}@test.local";
            var userId = await SecurityTestSupport.CreateUserAsync(factory, phone, email, centerId: seed.CenterA);

            var code = await SecurityTestSupport.SendCodeAndReadAsync(client, factory, phone, email);
            var wrong = code == "000000" ? "111111" : "000000";

            var response = await client.PostAsJsonAsync(SecurityTestSupport.ResetPasswordRoute, new
            {
                phoneNumber = phone,
                code = wrong,
                password = NewPassword,
                confirmPassword = NewPassword
            });

            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
            Assert.True(await SecurityTestSupport.CheckPasswordAsync(factory, userId, "OldPass123!"));
        }
    }

    [Fact]
    public async Task Expired_code_is_rejected()
    {
        var (factory, client) = NewAnonymousContext();
        using (factory)
        {
            var seed = factory.EnsureSeeded();
            var phone = "0109" + SecurityTestSupport.RandomDigits(7);
            var email = $"{phone}@test.local";
            var userId = await SecurityTestSupport.CreateUserAsync(factory, phone, email, centerId: seed.CenterA);

            var code = await SecurityTestSupport.SendCodeAndReadAsync(client, factory, phone, email);
            await ExpireCodeAsync(factory, userId);

            var response = await client.PostAsJsonAsync(SecurityTestSupport.ResetPasswordRoute, new
            {
                phoneNumber = phone,
                code,
                password = NewPassword,
                confirmPassword = NewPassword
            });

            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
            Assert.True(await SecurityTestSupport.CheckPasswordAsync(factory, userId, "OldPass123!"));
        }
    }

    [Fact]
    public async Task Code_can_only_be_used_once()
    {
        var (factory, client) = NewAnonymousContext();
        using (factory)
        {
            var seed = factory.EnsureSeeded();
            var phone = "0109" + SecurityTestSupport.RandomDigits(7);
            var email = $"{phone}@test.local";
            await SecurityTestSupport.CreateUserAsync(factory, phone, email, centerId: seed.CenterA);

            var code = await SecurityTestSupport.SendCodeAndReadAsync(client, factory, phone, email);

            var first = await client.PostAsJsonAsync(SecurityTestSupport.ResetPasswordRoute, new
            {
                phoneNumber = phone,
                code,
                password = NewPassword,
                confirmPassword = NewPassword
            });
            Assert.Equal(HttpStatusCode.OK, first.StatusCode);

            var second = await client.PostAsJsonAsync(SecurityTestSupport.ResetPasswordRoute, new
            {
                phoneNumber = phone,
                code,
                password = "Another123!",
                confirmPassword = "Another123!"
            });
            Assert.Equal(HttpStatusCode.BadRequest, second.StatusCode);
        }
    }

    [Fact]
    public async Task Unknown_phone_does_not_leak_account_existence()
    {
        var (factory, client) = NewAnonymousContext();
        using (factory)
        {
            factory.EnsureSeeded();
            var unknownPhone = "0109" + SecurityTestSupport.RandomDigits(7);

            var before = ScopeApiFactory.SentEmails.Count;
            var send = await client.PostAsJsonAsync(SecurityTestSupport.SendResetCodeRoute, new
            {
                phoneNumber = unknownPhone
            });
            await Task.Delay(300);

            Assert.Equal(HttpStatusCode.OK, send.StatusCode);
            Assert.Equal(before, ScopeApiFactory.SentEmails.Count);

            var reset = await client.PostAsJsonAsync(SecurityTestSupport.ResetPasswordRoute, new
            {
                phoneNumber = unknownPhone,
                code = "123456",
                password = NewPassword,
                confirmPassword = NewPassword
            });

            Assert.Equal(HttpStatusCode.BadRequest, reset.StatusCode);
            var body = await reset.Content.ReadAsStringAsync();
            Assert.DoesNotContain(unknownPhone, body, StringComparison.OrdinalIgnoreCase);
        }
    }

    [Fact]
    public async Task Code_is_invalidated_after_too_many_attempts()
    {
        var (factory, client) = NewAnonymousContext();
        using (factory)
        {
            var seed = factory.EnsureSeeded();
            var phone = "0109" + SecurityTestSupport.RandomDigits(7);
            var email = $"{phone}@test.local";
            var userId = await SecurityTestSupport.CreateUserAsync(factory, phone, email, centerId: seed.CenterA);

            var code = await SecurityTestSupport.SendCodeAndReadAsync(client, factory, phone, email);
            var wrong = code == "000000" ? "111111" : "000000";

            for (var attempt = 0; attempt < 5; attempt++)
            {
                var wrongResponse = await client.PostAsJsonAsync(SecurityTestSupport.ResetPasswordRoute, new
                {
                    phoneNumber = phone,
                    code = wrong,
                    password = NewPassword,
                    confirmPassword = NewPassword
                });
                Assert.Equal(HttpStatusCode.BadRequest, wrongResponse.StatusCode);
            }

            var correct = await client.PostAsJsonAsync(SecurityTestSupport.ResetPasswordRoute, new
            {
                phoneNumber = phone,
                code,
                password = NewPassword,
                confirmPassword = NewPassword
            });

            Assert.Equal(HttpStatusCode.BadRequest, correct.StatusCode);
            Assert.True(await SecurityTestSupport.CheckPasswordAsync(factory, userId, "OldPass123!"));
        }
    }

    [Fact]
    public async Task Successful_reset_revokes_refresh_tokens()
    {
        var (factory, client) = NewAnonymousContext();
        using (factory)
        {
            var seed = factory.EnsureSeeded();
            var phone = "0109" + SecurityTestSupport.RandomDigits(7);
            var email = $"{phone}@test.local";
            var userId = await SecurityTestSupport.CreateUserAsync(factory, phone, email, centerId: seed.CenterA);
            await SecurityTestSupport.AddActiveRefreshTokenAsync(factory, userId);

            var code = await SecurityTestSupport.SendCodeAndReadAsync(client, factory, phone, email);

            var response = await client.PostAsJsonAsync(SecurityTestSupport.ResetPasswordRoute, new
            {
                phoneNumber = phone,
                code,
                password = NewPassword,
                confirmPassword = NewPassword
            });
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            using var scope = factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var tokens = await db.UserRefreshToken.Where(t => t.UserId == userId).ToListAsync();

            Assert.NotEmpty(tokens);
            Assert.All(tokens, token => Assert.True(token.IsRevoked));
        }
    }

    [Fact]
    public async Task Student_token_cannot_reset_a_super_admin_password()
    {
        var (factory, client) = NewAnonymousContext();
        using (factory)
        {
            var seed = factory.EnsureSeeded();
            var phone = "0109" + SecurityTestSupport.RandomDigits(7);
            var email = $"{phone}@test.local";
            var superAdminId = await SecurityTestSupport.CreateUserAsync(factory, phone, email,
                role: AppRoles.SuperAdmin, centerId: seed.CenterA);

            var studentPhone = "0108" + SecurityTestSupport.RandomDigits(7);
            var studentUserId = await SecurityTestSupport.CreateUserAsync(factory, studentPhone,
                $"{studentPhone}@test.local", role: AppRoles.Student, centerId: seed.CenterA);
            var studentClient = SecurityTestSupport.Client(factory, studentUserId, AppRoles.Student, seed.CenterA);
            var response = await studentClient.PostAsJsonAsync(SecurityTestSupport.ResetPasswordRoute, new
            {
                phoneNumber = phone,
                code = "123456",
                password = NewPassword,
                confirmPassword = NewPassword
            });

            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
            Assert.True(await SecurityTestSupport.CheckPasswordAsync(factory, superAdminId, "OldPass123!"));
        }
    }

    [Fact]
    public async Task Sent_code_is_stored_hashed_not_in_plaintext()
    {
        var (factory, client) = NewAnonymousContext();
        using (factory)
        {
            var seed = factory.EnsureSeeded();
            var phone = "0109" + SecurityTestSupport.RandomDigits(7);
            var email = $"{phone}@test.local";
            var userId = await SecurityTestSupport.CreateUserAsync(factory, phone, email, centerId: seed.CenterA);

            var code = await SecurityTestSupport.SendCodeAndReadAsync(client, factory, phone, email);

            var hash = await SecurityTestSupport.ReadStringPropertyAsync(factory, userId, "ResetCodeHash");
            var expiresAt = await SecurityTestSupport.ReadDatePropertyAsync(factory, userId, "ResetCodeExpiresAt");

            Assert.False(string.IsNullOrWhiteSpace(hash));
            Assert.NotEqual(code, hash);
            Assert.True(hash!.Length >= 32);
            Assert.NotNull(expiresAt);
            Assert.True(expiresAt > DateTime.UtcNow);
        }
    }

    [Fact]
    public async Task Send_code_is_rate_limited()
    {
        var (factory, client) = NewAnonymousContext();
        using (factory)
        {
            var seed = factory.EnsureSeeded();
            var phone = "0109" + SecurityTestSupport.RandomDigits(7);
            await SecurityTestSupport.CreateUserAsync(factory, phone, $"{phone}@test.local", centerId: seed.CenterA);

            var sawTooMany = false;
            for (var i = 0; i < 25 && !sawTooMany; i++)
            {
                var response = await client.PostAsJsonAsync(SecurityTestSupport.SendResetCodeRoute,
                    new { phoneNumber = phone });
                sawTooMany = response.StatusCode == HttpStatusCode.TooManyRequests;
            }

            Assert.True(sawTooMany, "Send-code endpoint never returned HTTP 429.");
        }
    }

    private static async Task ExpireCodeAsync(ScopeApiFactory factory, Guid userId)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var past = DateTime.UtcNow.AddMinutes(-1);

        await db.Database.ExecuteSqlInterpolatedAsync(
            $"UPDATE AspNetUsers SET ResetCodeExpiresAt = {past} WHERE Id = {userId}");
    }
}

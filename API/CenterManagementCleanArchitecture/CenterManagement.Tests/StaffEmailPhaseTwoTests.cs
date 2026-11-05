using System.Collections.Concurrent;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.RegularExpressions;
using CenterManagement.Core.Features.Shared.EmailFeature.Senders;
using CenterManagement.Core.Helpers;
using CenterManagement.Data.AppMetaData;
using CenterManagement.Data.Entities.Abstractions;
using CenterManagement.Data.Entities.Identity;
using CenterManagement.Infrustructure.Data;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Serilog;

namespace CenterManagement.Tests;

/// <summary>
/// Phase 2 of the optional staff-email feature: out-of-band password recovery by
/// email or phone, the uniform "we will not tell you whether that account
/// exists" contract, rate limiting, and the tokenized self-service email change
/// that keeps the old address active until the new one is confirmed.
/// </summary>
[Collection("PasswordSecurity")]
public sealed class StaffEmailPhaseTwoTests
{
    private const string ResetSendRoute = SecurityTestSupport.SendResetCodeRoute;
    private const string ResetVerifyRoute = SecurityTestSupport.ResetPasswordRoute;
    private const string RequestEmailChangeRoute = "Api/V1/Profile/RequestEmailChange";
    private const string ConfirmEmailChangeRoute = "Api/V1/Authentication/Confirm-Email-Change";
    private const string NewPassword = "BrandNew123!";
    private const string OldPassword = "OldPass123!";

    private static string UniqueEmail(string prefix = "staff")
        => $"{prefix}.{Guid.NewGuid():N}@example.com";

    private static string UniquePhone()
        => "0109" + SecurityTestSupport.RandomDigits(7);

    private static HttpClient Anonymous(ScopeApiFactory factory)
        => factory.CreateClient();

    private static HttpClient AnonymousWithoutRedirects(ScopeApiFactory factory)
        => factory.CreateClient(new Microsoft.AspNetCore.Mvc.Testing.WebApplicationFactoryClientOptions
        {
            AllowAutoRedirect = false
        });

    private static HttpClient Staff(
        ScopeApiFactory factory,
        Guid userId,
        Guid centerId,
        string role = AppRoles.Teacher)
        => SecurityTestSupport.Client(factory, userId, role, centerId);

    private static async Task<User> ReadUserAsync(ScopeApiFactory factory, Guid userId)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        return await db.Users.SingleAsync(user => user.Id == userId);
    }

    private static async Task UpdateUserAsync(
        ScopeApiFactory factory,
        Guid userId,
        Action<User> update)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var user = await db.Users.SingleAsync(candidate => candidate.Id == userId);
        update(user);
        await db.SaveChangesAsync();
    }

    private static async Task<List<UserRefreshToken>> ReadRefreshTokensAsync(
        ScopeApiFactory factory,
        Guid userId)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        return await db.UserRefreshToken
            .Where(token => token.UserId == userId)
            .ToListAsync();
    }

    private static async Task<JsonDocument> ReadJsonAsync(HttpResponseMessage response)
        => JsonDocument.Parse(await response.Content.ReadAsStringAsync());

    private static async Task<string?> ReadMessageAsync(HttpResponseMessage response)
    {
        using var document = await ReadJsonAsync(response);
        return document.RootElement.TryGetProperty("message", out var message)
               && message.ValueKind == JsonValueKind.String
            ? message.GetString()
            : null;
    }

    private static async Task<string?> ReadDataAsync(HttpResponseMessage response)
    {
        using var document = await ReadJsonAsync(response);
        return document.RootElement.TryGetProperty("data", out var data)
               && data.ValueKind == JsonValueKind.String
            ? data.GetString()
            : null;
    }

    private static async Task<string> SendCodeByEmailAsync(
        HttpClient client,
        ScopeApiFactory factory,
        string email)
    {
        var response = await client.PostAsJsonAsync(ResetSendRoute, new { identifier = email });
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var captured = await WaitForEmailAsync(email, "Reset Password");
        return SecurityTestSupport.ExtractResetCode(captured);
    }

    private static async Task<FakeEmailSender.CapturedEmail> WaitForEmailAsync(
        string toEmail,
        string subject,
        TimeSpan? timeout = null)
    {
        var deadline = DateTime.UtcNow + (timeout ?? TimeSpan.FromSeconds(8));

        while (DateTime.UtcNow < deadline)
        {
            var email = ScopeApiFactory.SentEmails.LastOrDefault(candidate =>
                string.Equals(candidate.Email, toEmail, StringComparison.OrdinalIgnoreCase) &&
                string.Equals(candidate.Subject, subject, StringComparison.Ordinal));

            if (email is not null)
                return email;

            await Task.Delay(50);
        }

        Assert.Fail($"No '{subject}' email was captured for {toEmail}.");
        throw new InvalidOperationException("unreachable");
    }

    private static string ExtractConfirmationLink(string message)
    {
        var match = Regex.Match(message, "href=\"(?<link>[^\"]+)\"", RegexOptions.IgnoreCase);

        Assert.True(match.Success, $"No confirmation link found in: {message}");
        return match.Groups["link"].Value.Replace("&amp;", "&");
    }

    private static string ToRelativeUrl(string absoluteUrl)
    {
        var uri = new Uri(absoluteUrl);
        return uri.PathAndQuery;
    }

    private static async Task<Guid> CreateUserWithoutEmailAsync(
        ScopeApiFactory factory,
        string role,
        Guid centerId)
    {
        using var scope = factory.Services.CreateScope();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<User>>();
        var phone = UniquePhone();

        var user = new User
        {
            Id = Guid.NewGuid(),
            UserName = phone,
            NormalizedUserName = phone.ToUpperInvariant(),
            PhoneNumber = phone,
            PhoneNumberConfirmed = true,
            FullName = "No Email " + phone,
            CenterId = centerId,
            CreatedAt = DateTime.UtcNow
        };

        var result = await userManager.CreateAsync(user, OldPassword);
        Assert.True(result.Succeeded,
            "Could not seed email-less user: " +
            string.Join("; ", result.Errors.Select(error => error.Description)));

        var roleResult = await userManager.AddToRoleAsync(user, role);
        Assert.True(roleResult.Succeeded,
            "Could not assign role: " +
            string.Join("; ", roleResult.Errors.Select(error => error.Description)));

        return user.Id;
    }

    private static async Task<Guid> CreateUserAsync(
        ScopeApiFactory factory,
        string email,
        string role,
        Guid centerId)
    {
        var phone = UniquePhone();
        return await SecurityTestSupport.CreateUserAsync(
            factory,
            phone,
            email,
            password: OldPassword,
            role: role,
            centerId: centerId);
    }

    // ---------------- uniform send contract ----------------

    [Fact]
    public async Task Send_code_by_email_returns_the_exact_uniform_message_and_emails_the_account()
    {
        using var factory = new ScopeApiFactory();
        var seed = factory.EnsureSeeded();
        ScopeApiFactory.ClearSentEmails();

        var email = UniqueEmail();
        await CreateUserAsync(factory, email, AppRoles.Teacher, seed.CenterA);

        var response = await Anonymous(factory)
            .PostAsJsonAsync(ResetSendRoute, new { identifier = email });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(AccountRecoveryHelper.SendCodeMessage, await ReadDataAsync(response));

        var captured = await WaitForEmailAsync(email, "Reset Password");
        Assert.Matches(@"\b\d{6}\b", captured.Message);
    }

    [Fact]
    public async Task Send_code_unknown_identifier_is_indistinguishable_and_sends_nothing()
    {
        using var factory = new ScopeApiFactory();
        factory.EnsureSeeded();
        ScopeApiFactory.ClearSentEmails();

        var email = UniqueEmail("nobody");

        var response = await Anonymous(factory)
            .PostAsJsonAsync(ResetSendRoute, new { identifier = email });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(AccountRecoveryHelper.SendCodeMessage, await ReadDataAsync(response));

        await Task.Delay(300);
        Assert.DoesNotContain(ScopeApiFactory.SentEmails,
            sent => string.Equals(sent.Email, email, StringComparison.OrdinalIgnoreCase));
    }

    [Fact]
    public async Task Send_code_account_without_email_is_indistinguishable_and_sends_nothing()
    {
        using var factory = new ScopeApiFactory();
        var seed = factory.EnsureSeeded();
        ScopeApiFactory.ClearSentEmails();

        var userId = await CreateUserWithoutEmailAsync(factory, AppRoles.Teacher, seed.CenterA);
        var phone = (await ReadUserAsync(factory, userId)).PhoneNumber!;

        var response = await Anonymous(factory)
            .PostAsJsonAsync(ResetSendRoute, new { identifier = phone });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(AccountRecoveryHelper.SendCodeMessage, await ReadDataAsync(response));

        await Task.Delay(300);
        Assert.DoesNotContain(ScopeApiFactory.SentEmails,
            sent => string.Equals(sent.Email, phone, StringComparison.OrdinalIgnoreCase));
    }

    [Fact]
    public async Task Students_and_parents_are_not_recoverable_but_get_the_same_answer()
    {
        using var factory = new ScopeApiFactory();
        var seed = factory.EnsureSeeded();

        var studentEmail = UniqueEmail("student");
        var parentEmail = UniqueEmail("parent");
        await CreateUserAsync(factory, studentEmail, AppRoles.Student, seed.CenterA);
        await CreateUserAsync(factory, parentEmail, AppRoles.Parent, seed.CenterA);

        ScopeApiFactory.ClearSentEmails();

        foreach (var email in new[] { studentEmail, parentEmail })
        {
            var response = await Anonymous(factory)
                .PostAsJsonAsync(ResetSendRoute, new { identifier = email });

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.Equal(AccountRecoveryHelper.SendCodeMessage, await ReadDataAsync(response));
        }

        await Task.Delay(300);
        Assert.DoesNotContain(ScopeApiFactory.SentEmails,
            sent => string.Equals(sent.Email, studentEmail, StringComparison.OrdinalIgnoreCase) ||
                    string.Equals(sent.Email, parentEmail, StringComparison.OrdinalIgnoreCase));
    }

    // ---------------- reset exchange ----------------

    [Fact]
    public async Task Reset_by_email_changes_the_password_revokes_tokens_and_notifies_the_account()
    {
        using var factory = new ScopeApiFactory();
        var seed = factory.EnsureSeeded();
        ScopeApiFactory.ClearSentEmails();

        var email = UniqueEmail();
        var userId = await CreateUserAsync(factory, email, AppRoles.Teacher, seed.CenterA);
        await SecurityTestSupport.AddActiveRefreshTokenAsync(factory, userId);

        var code = await SendCodeByEmailAsync(Anonymous(factory), factory, email);

        var reset = await Anonymous(factory).PostAsJsonAsync(ResetVerifyRoute, new
        {
            identifier = email,
            code,
            password = NewPassword,
            confirmPassword = NewPassword
        });

        Assert.Equal(HttpStatusCode.OK, reset.StatusCode);
        Assert.True(await SecurityTestSupport.CheckPasswordAsync(factory, userId, NewPassword));
        Assert.False(await SecurityTestSupport.CheckPasswordAsync(factory, userId, OldPassword));

        var tokens = await ReadRefreshTokensAsync(factory, userId);
        Assert.NotEmpty(tokens);
        Assert.All(tokens, token => Assert.True(token.IsRevoked));

        var notice = await WaitForEmailAsync(email, "Password Changed");
        Assert.Contains("تغيير كلمة المرور", notice.Message);
    }

    [Fact]
    public async Task Reset_rejects_a_wrong_code_with_the_generic_message()
    {
        using var factory = new ScopeApiFactory();
        var seed = factory.EnsureSeeded();
        ScopeApiFactory.ClearSentEmails();

        var email = UniqueEmail();
        var userId = await CreateUserAsync(factory, email, AppRoles.Teacher, seed.CenterA);

        var code = await SendCodeByEmailAsync(Anonymous(factory), factory, email);
        var wrong = code == "000000" ? "111111" : "000000";

        var response = await Anonymous(factory).PostAsJsonAsync(ResetVerifyRoute, new
        {
            identifier = email,
            code = wrong,
            password = NewPassword,
            confirmPassword = NewPassword
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal(AccountRecoveryHelper.ResetFailedMessage, await ReadMessageAsync(response));
        Assert.True(await SecurityTestSupport.CheckPasswordAsync(factory, userId, OldPassword));
    }

    [Fact]
    public async Task Reset_rejects_an_expired_code_with_the_generic_message()
    {
        using var factory = new ScopeApiFactory();
        var seed = factory.EnsureSeeded();
        ScopeApiFactory.ClearSentEmails();

        var email = UniqueEmail();
        var userId = await CreateUserAsync(factory, email, AppRoles.Teacher, seed.CenterA);

        var code = await SendCodeByEmailAsync(Anonymous(factory), factory, email);
        await UpdateUserAsync(factory, userId,
            user => user.ResetCodeExpiresAt = DateTime.UtcNow.AddMinutes(-1));

        var response = await Anonymous(factory).PostAsJsonAsync(ResetVerifyRoute, new
        {
            identifier = email,
            code,
            password = NewPassword,
            confirmPassword = NewPassword
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal(AccountRecoveryHelper.ResetFailedMessage, await ReadMessageAsync(response));
        Assert.True(await SecurityTestSupport.CheckPasswordAsync(factory, userId, OldPassword));
    }

    [Fact]
    public async Task Reset_rejects_unknown_accounts_with_the_same_generic_message()
    {
        using var factory = new ScopeApiFactory();
        factory.EnsureSeeded();
        ScopeApiFactory.ClearSentEmails();

        var response = await Anonymous(factory).PostAsJsonAsync(ResetVerifyRoute, new
        {
            identifier = UniqueEmail("ghost"),
            code = "123456",
            password = NewPassword,
            confirmPassword = NewPassword
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal(AccountRecoveryHelper.ResetFailedMessage, await ReadMessageAsync(response));
    }

    [Fact]
    public async Task Reset_code_is_invalidated_after_the_attempt_limit()
    {
        using var factory = new ScopeApiFactory();
        var seed = factory.EnsureSeeded();
        ScopeApiFactory.ClearSentEmails();

        var email = UniqueEmail();
        var userId = await CreateUserAsync(factory, email, AppRoles.Teacher, seed.CenterA);

        var code = await SendCodeByEmailAsync(Anonymous(factory), factory, email);
        var wrong = code == "000000" ? "111111" : "000000";

        for (var attempt = 0; attempt < 5; attempt++)
        {
            var rejected = await Anonymous(factory).PostAsJsonAsync(ResetVerifyRoute, new
            {
                identifier = email,
                code = wrong,
                password = NewPassword,
                confirmPassword = NewPassword
            });

            Assert.Equal(HttpStatusCode.BadRequest, rejected.StatusCode);
            Assert.Equal(AccountRecoveryHelper.ResetFailedMessage, await ReadMessageAsync(rejected));
        }

        var afterLimit = await Anonymous(factory).PostAsJsonAsync(ResetVerifyRoute, new
        {
            identifier = email,
            code,
            password = NewPassword,
            confirmPassword = NewPassword
        });

        Assert.Equal(HttpStatusCode.BadRequest, afterLimit.StatusCode);
        Assert.Equal(AccountRecoveryHelper.ResetFailedMessage, await ReadMessageAsync(afterLimit));
        Assert.True(await SecurityTestSupport.CheckPasswordAsync(factory, userId, OldPassword));
    }

    // ---------------- transport rate limits ----------------

    [Fact]
    public async Task Sending_recovery_codes_is_rate_limited_per_identifier()
    {
        using var factory = new ScopeApiFactory();
        factory.EnsureSeeded();
        ScopeApiFactory.ClearSentEmails();

        var client = Anonymous(factory);
        var email = UniqueEmail("flood");
        var sawTooMany = false;

        for (var attempt = 0; attempt < 12 && !sawTooMany; attempt++)
        {
            var response = await client.PostAsJsonAsync(ResetSendRoute, new { identifier = email });
            sawTooMany = response.StatusCode == HttpStatusCode.TooManyRequests;
        }

        Assert.True(sawTooMany, "The identifier-based recovery limiter never fired.");
    }

    [Fact]
    public async Task Verifying_recovery_codes_is_rate_limited_per_identifier()
    {
        using var factory = new ScopeApiFactory();
        factory.EnsureSeeded();
        ScopeApiFactory.ClearSentEmails();

        var client = Anonymous(factory);
        var email = UniqueEmail("flood");
        var sawTooMany = false;

        for (var attempt = 0; attempt < 12 && !sawTooMany; attempt++)
        {
            var response = await client.PostAsJsonAsync(ResetVerifyRoute, new
            {
                identifier = email,
                code = "000000",
                password = NewPassword,
                confirmPassword = NewPassword
            });

            sawTooMany = response.StatusCode == HttpStatusCode.TooManyRequests;
        }

        Assert.True(sawTooMany, "The identifier-based verification limiter never fired.");
    }

    // ---------------- no secrets in logs ----------------

    [Fact]
    public async Task Reset_code_and_identifiers_never_appear_in_application_logs()
    {
        var logs = new CapturingLoggerProvider();
        using var factory = new LoggingScopeApiFactory(logs);
        var seed = factory.EnsureSeeded();
        ScopeApiFactory.ClearSentEmails();

        var email = UniqueEmail("logs");
        var userId = await CreateUserAsync(factory, email, AppRoles.Teacher, seed.CenterA);
        var phone = (await ReadUserAsync(factory, userId)).PhoneNumber!;

        var client = Anonymous(factory);
        var code = await SendCodeByEmailAsync(client, factory, email);

        var reset = await client.PostAsJsonAsync(ResetVerifyRoute, new
        {
            identifier = email,
            code,
            password = NewPassword,
            confirmPassword = NewPassword
        });
        Assert.Equal(HttpStatusCode.OK, reset.StatusCode);

        // Let the fire-and-forget password-changed notification finish logging.
        await WaitForEmailAsync(email, "Password Changed");

        var applicationLogs = logs.Messages
            .Where(entry => entry.Category.StartsWith("CenterManagement", StringComparison.Ordinal))
            .Select(entry => entry.Message)
            .ToList();

        Assert.NotEmpty(applicationLogs);

        foreach (var message in applicationLogs)
        {
            Assert.DoesNotContain(email, message, StringComparison.OrdinalIgnoreCase);
            Assert.DoesNotContain(phone, message, StringComparison.Ordinal);
            Assert.DoesNotContain("رمز إعادة تعيين كلمة المرور", message, StringComparison.Ordinal);
            Assert.DoesNotMatch($@"(?<![0-9a-fA-F]){Regex.Escape(code)}(?![0-9a-fA-F])", message);
        }
    }

    // ---------------- self-service email change ----------------

    [Fact]
    public async Task Self_email_change_stages_the_new_address_and_keeps_the_old_one_active()
    {
        using var factory = new ScopeApiFactory();
        var seed = factory.EnsureSeeded();
        ScopeApiFactory.ClearSentEmails();

        var oldEmail = UniqueEmail("old");
        var newEmail = UniqueEmail("new");
        var userId = await CreateUserAsync(factory, oldEmail, AppRoles.Teacher, seed.CenterA);
        var phone = (await ReadUserAsync(factory, userId)).PhoneNumber!;

        var response = await Staff(factory, userId, seed.CenterA)
            .PutAsJsonAsync(RequestEmailChangeRoute, new { email = newEmail.ToUpperInvariant() });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var staged = await ReadUserAsync(factory, userId);
        Assert.Equal(oldEmail, staged.Email);
        Assert.Equal(oldEmail.ToUpperInvariant(), staged.NormalizedEmail);
        Assert.True(staged.EmailConfirmed);
        Assert.Equal(newEmail, staged.PendingEmail);

        // The link goes to the new address, which proves ownership early but is
        // not the active address yet.
        var confirmation = await WaitForEmailAsync(newEmail, "Confirm New Email");
        Assert.Contains("تأكيد البريد الإلكتروني", confirmation.Message);

        // The old address keeps receiving recovery codes until confirmation.
        var code = await SendCodeByEmailAsync(Anonymous(factory), factory, oldEmail);

        var reset = await Anonymous(factory).PostAsJsonAsync(ResetVerifyRoute, new
        {
            identifier = phone,
            code,
            password = NewPassword,
            confirmPassword = NewPassword
        });
        Assert.Equal(HttpStatusCode.OK, reset.StatusCode);
        Assert.True(await SecurityTestSupport.CheckPasswordAsync(factory, userId, NewPassword));
    }

    [Fact]
    public async Task Admin_email_edit_or_clear_retires_a_staged_self_service_address()
    {
        using var factory = new ScopeApiFactory();
        var seed = factory.EnsureSeeded();
        ScopeApiFactory.ClearSentEmails();

        var oldEmail = UniqueEmail("old");
        var pendingEmail = UniqueEmail("pending");
        var adminEmail = UniqueEmail("admin");
        var userId = await CreateUserAsync(factory, oldEmail, AppRoles.Teacher, seed.CenterA);

        var request = await Staff(factory, userId, seed.CenterA)
            .PutAsJsonAsync(RequestEmailChangeRoute, new { email = pendingEmail });
        Assert.Equal(HttpStatusCode.OK, request.StatusCode);

        var staged = await ReadUserAsync(factory, userId);
        Assert.Equal(pendingEmail, staged.PendingEmail);
        Assert.NotNull(staged.PendingEmailRequestedAt);

        var confirmation = await WaitForEmailAsync(pendingEmail, "Confirm New Email");
        var link = ExtractConfirmationLink(confirmation.Message);

        var owner = SecurityTestSupport.CenterAdminClient(
            factory, seed.CenterOwnerA, seed.CenterA);

        var change = await owner.PutAsJsonAsync("Api/V1/Teacher/Edit", new
        {
            id = userId,
            fullName = "Admin Edited Teacher",
            email = adminEmail
        });
        Assert.True(change.IsSuccessStatusCode, await change.Content.ReadAsStringAsync());

        var afterChange = await ReadUserAsync(factory, userId);
        Assert.Equal(adminEmail, afterChange.Email);
        Assert.True(afterChange.EmailConfirmed);
        Assert.Null(afterChange.PendingEmail);
        Assert.Null(afterChange.PendingEmailRequestedAt);

        // The link that was emailed before the admin edit must not resurrect the
        // address the admin just replaced.
        var redirect = await AnonymousWithoutRedirects(factory).GetAsync(ToRelativeUrl(link));
        Assert.Equal(HttpStatusCode.Redirect, redirect.StatusCode);
        Assert.Contains("status=invalid", redirect.Headers.Location!.ToString());

        var afterLink = await ReadUserAsync(factory, userId);
        Assert.Equal(adminEmail, afterLink.Email);
        Assert.True(afterLink.EmailConfirmed);
        Assert.Null(afterLink.PendingEmail);

        // The same holds when the admin clears the address entirely.
        var secondPending = UniqueEmail("pending2");
        var secondRequest = await Staff(factory, userId, seed.CenterA)
            .PutAsJsonAsync(RequestEmailChangeRoute, new { email = secondPending });
        Assert.Equal(HttpStatusCode.OK, secondRequest.StatusCode);
        Assert.Equal(secondPending, (await ReadUserAsync(factory, userId)).PendingEmail);

        var clear = await owner.PutAsJsonAsync("Api/V1/Teacher/Edit", new
        {
            id = userId,
            fullName = "Admin Edited Teacher",
            email = ""
        });
        Assert.True(clear.IsSuccessStatusCode, await clear.Content.ReadAsStringAsync());

        var cleared = await ReadUserAsync(factory, userId);
        Assert.Null(cleared.Email);
        Assert.Null(cleared.NormalizedEmail);
        Assert.False(cleared.EmailConfirmed);
        Assert.Null(cleared.PendingEmail);
        Assert.Null(cleared.PendingEmailRequestedAt);
    }

    [Fact]
    public async Task Self_email_change_rejects_an_address_owned_by_another_account_without_leaking_it()
    {
        using var factory = new ScopeApiFactory();
        var seed = factory.EnsureSeeded();
        ScopeApiFactory.ClearSentEmails();

        var targetEmail = UniqueEmail("target");
        var ownedEmail = UniqueEmail("owned");
        var targetId = await CreateUserAsync(factory, targetEmail, AppRoles.Teacher, seed.CenterA);
        var ownerId = await CreateUserAsync(factory, ownedEmail, AppRoles.Teacher, seed.CenterA);

        var owner = await ReadUserAsync(factory, ownerId);
        await UpdateUserAsync(factory, ownerId, user => user.FullName = "Hidden Account Owner");

        var response = await Staff(factory, targetId, seed.CenterA)
            .PutAsJsonAsync(RequestEmailChangeRoute, new { email = ownedEmail });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal(UserEmailHelper.DuplicateMessage, await ReadMessageAsync(response));

        var body = await response.Content.ReadAsStringAsync();
        Assert.DoesNotContain(owner.PhoneNumber!, body, StringComparison.Ordinal);
        Assert.DoesNotContain("Hidden Account Owner", body, StringComparison.Ordinal);

        var target = await ReadUserAsync(factory, targetId);
        Assert.Null(target.PendingEmail);
    }

    [Fact]
    public async Task Students_and_parents_cannot_request_an_email_change()
    {
        using var factory = new ScopeApiFactory();
        var seed = factory.EnsureSeeded();
        ScopeApiFactory.ClearSentEmails();

        var studentId = await CreateUserAsync(
            factory, UniqueEmail("student"), AppRoles.Student, seed.CenterA);
        var parentId = await CreateUserAsync(
            factory, UniqueEmail("parent"), AppRoles.Parent, seed.CenterA);

        foreach (var (userId, role) in new[]
                 {
                     (studentId, AppRoles.Student),
                     (parentId, AppRoles.Parent)
                 })
        {
            var response = await Staff(factory, userId, seed.CenterA, role)
                .PutAsJsonAsync(RequestEmailChangeRoute, new { email = UniqueEmail("blocked") });

            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
            Assert.Null((await ReadUserAsync(factory, userId)).PendingEmail);
        }
    }

    [Fact]
    public async Task Confirmation_link_activates_the_pending_address_and_retires_the_old_one()
    {
        using var factory = new ScopeApiFactory();
        var seed = factory.EnsureSeeded();
        ScopeApiFactory.ClearSentEmails();

        var oldEmail = UniqueEmail("old");
        var newEmail = UniqueEmail("new");
        var userId = await CreateUserAsync(factory, oldEmail, AppRoles.Teacher, seed.CenterA);

        var request = await Staff(factory, userId, seed.CenterA)
            .PutAsJsonAsync(RequestEmailChangeRoute, new { email = newEmail });
        Assert.Equal(HttpStatusCode.OK, request.StatusCode);

        var confirmation = await WaitForEmailAsync(newEmail, "Confirm New Email");
        var link = ExtractConfirmationLink(confirmation.Message);

        var redirect = await AnonymousWithoutRedirects(factory)
            .GetAsync(ToRelativeUrl(link));

        Assert.Equal(HttpStatusCode.Redirect, redirect.StatusCode);
        Assert.Contains("status=success", redirect.Headers.Location!.ToString());

        var confirmed = await ReadUserAsync(factory, userId);
        Assert.Equal(newEmail, confirmed.Email);
        Assert.Equal(newEmail.ToUpperInvariant(), confirmed.NormalizedEmail);
        Assert.True(confirmed.EmailConfirmed);
        Assert.Null(confirmed.PendingEmail);

        ScopeApiFactory.ClearSentEmails();

        // The new address now receives recovery codes; the old one is inert.
        await SendCodeByEmailAsync(Anonymous(factory), factory, newEmail);

        var oldResponse = await Anonymous(factory)
            .PostAsJsonAsync(ResetSendRoute, new { identifier = oldEmail });
        Assert.Equal(HttpStatusCode.OK, oldResponse.StatusCode);

        await Task.Delay(300);
        Assert.DoesNotContain(ScopeApiFactory.SentEmails,
            sent => string.Equals(sent.Email, oldEmail, StringComparison.OrdinalIgnoreCase));
    }

    [Fact]
    public async Task Invalid_tampered_and_replayed_confirmation_links_change_nothing()
    {
        using var factory = new ScopeApiFactory();
        var seed = factory.EnsureSeeded();
        ScopeApiFactory.ClearSentEmails();

        var oldEmail = UniqueEmail("old");
        var newEmail = UniqueEmail("new");
        var userId = await CreateUserAsync(factory, oldEmail, AppRoles.Teacher, seed.CenterA);

        await Staff(factory, userId, seed.CenterA)
            .PutAsJsonAsync(RequestEmailChangeRoute, new { email = newEmail });

        var confirmation = await WaitForEmailAsync(newEmail, "Confirm New Email");
        var link = ExtractConfirmationLink(confirmation.Message);

        var invalidToken = Regex.Replace(link, "token=[^&]+", "token=definitely-wrong");
        var wrongToken = await AnonymousWithoutRedirects(factory)
            .GetAsync(ToRelativeUrl(invalidToken));
        Assert.Equal(HttpStatusCode.Redirect, wrongToken.StatusCode);
        Assert.Contains("status=invalid", wrongToken.Headers.Location!.ToString());

        var wrongEmail = Regex.Replace(link, "email=[^&]+",
            "email=" + Uri.EscapeDataString(UniqueEmail("attacker")));
        var tampered = await AnonymousWithoutRedirects(factory)
            .GetAsync(ToRelativeUrl(wrongEmail));
        Assert.Equal(HttpStatusCode.Redirect, tampered.StatusCode);
        Assert.Contains("status=invalid", tampered.Headers.Location!.ToString());

        var staged = await ReadUserAsync(factory, userId);
        Assert.Equal(oldEmail, staged.Email);
        Assert.Equal(newEmail, staged.PendingEmail);

        // The original link still works, but only once.
        var success = await AnonymousWithoutRedirects(factory).GetAsync(ToRelativeUrl(link));
        Assert.Contains("status=success", success.Headers.Location!.ToString());

        var replay = await AnonymousWithoutRedirects(factory).GetAsync(ToRelativeUrl(link));
        Assert.Contains("status=invalid", replay.Headers.Location!.ToString());

        var confirmed = await ReadUserAsync(factory, userId);
        Assert.Equal(newEmail, confirmed.Email);
        Assert.Null(confirmed.PendingEmail);
    }

    [Fact]
    public async Task A_pending_address_cannot_receive_a_recovery_code_before_confirmation()
    {
        using var factory = new ScopeApiFactory();
        var seed = factory.EnsureSeeded();
        ScopeApiFactory.ClearSentEmails();

        var oldEmail = UniqueEmail("old");
        var pendingEmail = UniqueEmail("pending");
        var userId = await CreateUserAsync(factory, oldEmail, AppRoles.Teacher, seed.CenterA);

        await Staff(factory, userId, seed.CenterA)
            .PutAsJsonAsync(RequestEmailChangeRoute, new { email = pendingEmail });

        ScopeApiFactory.ClearSentEmails();

        var response = await Anonymous(factory)
            .PostAsJsonAsync(ResetSendRoute, new { identifier = pendingEmail });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(AccountRecoveryHelper.SendCodeMessage, await ReadDataAsync(response));

        await Task.Delay(300);
        Assert.DoesNotContain(ScopeApiFactory.SentEmails,
            sent => string.Equals(sent.Email, pendingEmail, StringComparison.OrdinalIgnoreCase));

        var user = await ReadUserAsync(factory, userId);
        Assert.Equal(oldEmail, user.Email);
        Assert.True(user.EmailConfirmed);
    }

    [Fact]
    public async Task Confirmation_links_are_rate_limited()
    {
        using var factory = new ScopeApiFactory();
        factory.EnsureSeeded();

        var client = AnonymousWithoutRedirects(factory);
        var query =
            $"?userId={Guid.NewGuid()}&email={Uri.EscapeDataString(UniqueEmail("links"))}&token=wrong";
        var sawTooMany = false;

        for (var attempt = 0; attempt < 12 && !sawTooMany; attempt++)
        {
            var response = await client.GetAsync(ConfirmEmailChangeRoute + query);
            sawTooMany = response.StatusCode == HttpStatusCode.TooManyRequests;
        }

        Assert.True(sawTooMany, "Confirmation links are not protected by the recovery limiter.");
    }

    // ---------------- test-only logging capture ----------------

    private sealed class LoggingScopeApiFactory : ScopeApiFactory
    {
        private readonly CapturingLoggerProvider _logs;

        public LoggingScopeApiFactory(CapturingLoggerProvider logs)
        {
            _logs = logs;
        }

        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            base.ConfigureWebHost(builder);

            // Program.cs installs Serilog as the single logger factory, so a
            // plain ILoggerProvider would be ignored. Replace the factory with
            // one that also writes every event to the in-memory capture.
            builder.ConfigureServices(services =>
            {
                var logger = new LoggerConfiguration()
                    .MinimumLevel.Verbose()
                    .Enrich.FromLogContext()
                    .WriteTo.Sink(new CapturingLogSink(_logs))
                    .CreateLogger();

                services.AddSerilog(logger, dispose: true);
            });
        }
    }

    private sealed class CapturingLoggerProvider
    {
        public ConcurrentQueue<(string Category, string Message)> Messages { get; } = new();
    }

    private sealed class CapturingLogSink : Serilog.Core.ILogEventSink
    {
        private readonly CapturingLoggerProvider _logs;

        public CapturingLogSink(CapturingLoggerProvider logs)
        {
            _logs = logs;
        }

        public void Emit(Serilog.Events.LogEvent logEvent)
        {
            var category = logEvent.Properties.TryGetValue("SourceContext", out var value) &&
                           value is Serilog.Events.ScalarValue scalar
                ? scalar.Value?.ToString() ?? string.Empty
                : string.Empty;

            _logs.Messages.Enqueue((category, logEvent.RenderMessage()));
        }
    }
}

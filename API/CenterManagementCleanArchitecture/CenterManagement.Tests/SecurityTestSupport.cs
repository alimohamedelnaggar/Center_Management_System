using System.IdentityModel.Tokens.Jwt;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using CenterManagement.Core.Features.Shared.EmailFeature.Commands.Models;
using CenterManagement.Data.AppMetaData;
using CenterManagement.Data.Entities.Abstractions;
using CenterManagement.Data.Entities.Identity;
using CenterManagement.Infrustructure.Data;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;

namespace CenterManagement.Tests;

/// <summary>
/// The security tests forge/capture process-wide state (outgoing mail) so they
/// must not run side by side with each other.
/// </summary>
[CollectionDefinition("PasswordSecurity", DisableParallelization = true)]
public sealed class PasswordSecurityCollection
{
}

public static class SecurityTestSupport
{
    public const string OldResetPasswordRoute = "Api/V1/AuthenticationResetPassword";
    public const string SendResetCodeRoute = "Api/V1/Authentication/Send-Reset-Code";
    public const string ResetPasswordRoute = "Api/V1/Authentication/Reset-Password";
    public const string AssistantCreateRoute = "Api/V1/Assistant/Create";

    public static string AssistantResetPasswordRoute(Guid assistantId) =>
        $"Api/V1/Assistant/{assistantId}/Reset-Password";

    public static HttpClient CenterAdminClient(ScopeApiFactory factory, Guid ownerUserId, Guid centerId) =>
        Client(factory, ownerUserId, AppRoles.CenterOwner, centerId);

    public static HttpClient Client(ScopeApiFactory factory, Guid userId, string role, Guid centerId)
    {
        var client = factory.CreateClient();
        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", CreateToken(userId, role, centerId));
        return client;
    }

    public static string CreateToken(
        Guid userId,
        string role,
        Guid centerId,
        bool isCenterAdmin = false,
        IEnumerable<Claim>? extraClaims = null)
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

        if (extraClaims is not null)
            claims.AddRange(extraClaims);

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

    public static string RandomDigits(int length)
    {
        var digits = new char[length];
        for (var i = 0; i < length; i++)
            digits[i] = (char)('0' + Random.Shared.Next(0, 10));
        return new string(digits);
    }

    /// <summary>Creates a real phone+email user so the reset flow has a target.</summary>
    public static async Task<Guid> CreateUserAsync(
        ScopeApiFactory factory,
        string phone,
        string email,
        string password = "OldPass123!",
        string? role = null,
        Guid? centerId = null,
        bool mustChangePassword = false)
    {
        using var scope = factory.Services.CreateScope();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<User>>();

        var user = new User
        {
            Id = Guid.NewGuid(),
            UserName = phone,
            NormalizedUserName = phone.ToUpperInvariant(),
            PhoneNumber = phone,
            Email = email,
            NormalizedEmail = email.ToUpperInvariant(),
            EmailConfirmed = true,
            PhoneNumberConfirmed = true,
            FullName = "Reset Target",
            CenterId = centerId,
            CreatedAt = DateTime.UtcNow,
            MustChangePassword = mustChangePassword
        };

        var result = await userManager.CreateAsync(user, password);
        Assert.True(result.Succeeded,
            "Could not seed user: " + string.Join("; ", result.Errors.Select(e => e.Description)));

        if (role is not null)
        {
            var roleResult = await userManager.AddToRoleAsync(user, role);
            Assert.True(roleResult.Succeeded,
                "Could not assign role: " + string.Join("; ", roleResult.Errors.Select(e => e.Description)));
        }

        return user.Id;
    }

    public static async Task AddActiveRefreshTokenAsync(ScopeApiFactory factory, Guid userId)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        db.UserRefreshToken.Add(new UserRefreshToken
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Token = Guid.NewGuid().ToString("N"),
            JwtId = Guid.NewGuid().ToString("N"),
            CreatedAt = DateTime.UtcNow,
            ExpiresAt = DateTime.UtcNow.AddDays(7),
            IsRevoked = false,
            IsUsed = false
        });

        await db.SaveChangesAsync();
    }

    public static async Task<bool> CheckPasswordAsync(ScopeApiFactory factory, Guid userId, string password)
    {
        using var scope = factory.Services.CreateScope();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<User>>();
        var user = await userManager.FindByIdAsync(userId.ToString());
        return user is not null && await userManager.CheckPasswordAsync(user, password);
    }

    public static async Task<string?> ReadStringPropertyAsync(
        ScopeApiFactory factory,
        Guid userId,
        string propertyName)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        return await db.Users
            .Where(u => u.Id == userId)
            .Select(u => EF.Property<string?>(u, propertyName))
            .SingleAsync();
    }

    public static async Task<DateTime?> ReadDatePropertyAsync(
        ScopeApiFactory factory,
        Guid userId,
        string propertyName)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        return await db.Users
            .Where(u => u.Id == userId)
            .Select(u => EF.Property<DateTime?>(u, propertyName))
            .SingleAsync();
    }

    public static async Task<int> ReadIntPropertyAsync(
        ScopeApiFactory factory,
        Guid userId,
        string propertyName,
        int fallback)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var value = await db.Users
            .Where(u => u.Id == userId)
            .Select(u => EF.Property<int?>(u, propertyName))
            .SingleAsync();

        return value ?? fallback;
    }

    /// <summary>Pulls the 6-digit code out of the captured reset email.</summary>
    public static string ExtractResetCode(SendEmailCommand email)
    {
        var match = Regex.Match(email.Message ?? string.Empty, @"\b\d{6}\b");
        Assert.True(match.Success, $"No 6-digit code found in email body: {email.Message}");
        return match.Value;
    }

    public static async Task<SendEmailCommand> WaitForEmailAsync(string toEmail, TimeSpan? timeout = null)
    {
        var deadline = DateTime.UtcNow + (timeout ?? TimeSpan.FromSeconds(5));

        while (DateTime.UtcNow < deadline)
        {
            var email = ScopeApiFactory.SentEmails.LastOrDefault(e =>
                string.Equals(e.Email, toEmail, StringComparison.OrdinalIgnoreCase));

            if (email is not null)
                return email;

            await Task.Delay(50);
        }

        Assert.Fail($"No email was captured for {toEmail}.");
        throw new InvalidOperationException("unreachable");
    }

    /// <summary>Sends the reset code and returns the code from the captured email.</summary>
    public static async Task<string> SendCodeAndReadAsync(
        HttpClient client,
        ScopeApiFactory factory,
        string phone,
        string email)
    {
        var response = await client.PostAsJsonAsync(SendResetCodeRoute, new { phoneNumber = phone });
        Assert.Equal(System.Net.HttpStatusCode.OK, response.StatusCode);
        var captured = await WaitForEmailAsync(email);
        return ExtractResetCode(captured);
    }

    public static string? FindStringProperty(string json, string propertyName)
    {
        using var doc = JsonDocument.Parse(json);
        return Find(doc.RootElement, propertyName);
    }

    private static string? Find(JsonElement element, string propertyName)
    {
        switch (element.ValueKind)
        {
            case JsonValueKind.Object:
                foreach (var property in element.EnumerateObject())
                {
                    if (string.Equals(property.Name, propertyName, StringComparison.OrdinalIgnoreCase))
                        return property.Value.ValueKind == JsonValueKind.String
                            ? property.Value.GetString()
                            : property.Value.ToString();

                    var nested = Find(property.Value, propertyName);
                    if (nested is not null)
                        return nested;
                }

                break;
            case JsonValueKind.Array:
                foreach (var item in element.EnumerateArray())
                {
                    var nested = Find(item, propertyName);
                    if (nested is not null)
                        return nested;
                }

                break;
        }

        return null;
    }
}

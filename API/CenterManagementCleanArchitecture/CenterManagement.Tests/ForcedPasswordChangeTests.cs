using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using CenterManagement.Data.AppMetaData;
using CenterManagement.Data.Entities.Identity;
using CenterManagement.Data.Entities.Users;
using CenterManagement.Infrustructure.Data;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace CenterManagement.Tests;

/// <summary>
/// The temporary credential is the phone number (username = password = phone)
/// and the account cannot use any other endpoint until it is replaced.
/// </summary>
public sealed class ForcedPasswordChangeTests : IClassFixture<ScopeApiFactory>
{
    private const string SignInRoute = "Api/V1/Authentication/SignIn";
    private const string ChangePasswordRoute = "Api/V1/Profile/ChangePassword";
    private const string BlockedRoute = "Api/V1/Student/List";
    private const string MigrationRoute = "Api/V1/Platform/Flag-Legacy-Phone-Passwords";
    private const string NewPassword = "Student@2026";

    private readonly ScopeApiFactory _factory;
    private readonly SeedResult _seed;

    public ForcedPasswordChangeTests(ScopeApiFactory factory)
    {
        _factory = factory;
        _seed = _factory.EnsureSeeded();
    }

    [Fact]
    public async Task Temporary_password_blocks_the_api_until_it_is_replaced()
    {
        var phone = NewPhone();
        var userId = await CreatePortalUserAsync(phone, phone, mustChangePassword: true);

        var client = _factory.CreateClient();

        var signIn = await client.PostAsJsonAsync(SignInRoute, new
        {
            phoneNumber = phone,
            password = phone
        });

        Assert.Equal(HttpStatusCode.OK, signIn.StatusCode);

        string accessToken;
        using (var doc = JsonDocument.Parse(await signIn.Content.ReadAsStringAsync()))
        {
            Assert.True(doc.RootElement.GetProperty("mustChangePassword").GetBoolean());
            accessToken = doc.RootElement.GetProperty("accessToken").GetString()!;
        }

        Assert.True(TokenHasForcedChangeClaim(accessToken));

        var blocked = await AuthorizedClient(accessToken).GetAsync(BlockedRoute);
        Assert.Equal(HttpStatusCode.Forbidden, blocked.StatusCode);

        using (var doc = JsonDocument.Parse(await blocked.Content.ReadAsStringAsync()))
        {
            Assert.Equal(
                AppPolicies.PasswordChangeRequiredCode,
                doc.RootElement.GetProperty("code").GetString());
        }

        // The profile endpoint stays reachable while the change is pending.
        var me = await AuthorizedClient(accessToken)
            .GetAsync("Api/V1/Profile/GetMyProfile");
        Assert.Equal(HttpStatusCode.OK, me.StatusCode);

        var change = await AuthorizedClient(accessToken).PutAsJsonAsync(ChangePasswordRoute, new
        {
            currentPassword = phone,
            newPassword = NewPassword,
            confirmPassword = NewPassword
        });

        Assert.Equal(HttpStatusCode.OK, change.StatusCode);

        string newAccessToken;
        using (var doc = JsonDocument.Parse(await change.Content.ReadAsStringAsync()))
        {
            var data = doc.RootElement.GetProperty("data");
            Assert.False(data.GetProperty("mustChangePassword").GetBoolean());
            newAccessToken = data.GetProperty("accessToken").GetString()!;
        }

        Assert.False(TokenHasForcedChangeClaim(newAccessToken));
        Assert.True(await SecurityTestSupport.CheckPasswordAsync(_factory, userId, NewPassword));
        Assert.False(await ReadMustChangePasswordAsync(userId));

        // The session that used the temporary password is dead.
        Assert.True(await RefreshTokenIsRevokedAsync(userId));

        var after = await AuthorizedClient(newAccessToken)
            .GetAsync("Api/V1/Profile/GetMyProfile");
        Assert.Equal(HttpStatusCode.OK, after.StatusCode);
    }

    [Fact]
    public async Task Changing_to_the_phone_is_rejected()
    {
        var phone = NewPhone();
        var userId = await CreatePortalUserAsync(phone, phone, mustChangePassword: true);
        var client = _factory.CreateClient();

        var signIn = await client.PostAsJsonAsync(SignInRoute, new
        {
            phoneNumber = phone,
            password = phone
        });

        string accessToken;
        using (var doc = JsonDocument.Parse(await signIn.Content.ReadAsStringAsync()))
            accessToken = doc.RootElement.GetProperty("accessToken").GetString()!;

        var withPhone = await AuthorizedClient(accessToken).PutAsJsonAsync(
            ChangePasswordRoute,
            new
            {
                currentPassword = phone,
                newPassword = phone,
                confirmPassword = phone
            });

        Assert.Equal(HttpStatusCode.BadRequest, withPhone.StatusCode);

        Assert.True(await SecurityTestSupport.CheckPasswordAsync(_factory, userId, phone));
        Assert.True(await ReadMustChangePasswordAsync(userId));
    }

    [Fact]
    public async Task Migration_flags_only_accounts_still_using_the_phone()
    {
        var legacyPhone = NewPhone();
        var changedPhone = NewPhone();

        var legacyId = await CreatePortalUserAsync(
            legacyPhone, legacyPhone, mustChangePassword: false);
        var changedId = await CreatePortalUserAsync(
            changedPhone, NewPassword, mustChangePassword: false);

        var superAdmin = SecurityTestSupport.Client(
            _factory, Guid.NewGuid(), AppRoles.SuperAdmin, _seed.CenterA);

        var first = await superAdmin.PostAsync(MigrationRoute, content: null);
        Assert.Equal(HttpStatusCode.OK, first.StatusCode);

        Assert.True(await ReadMustChangePasswordAsync(legacyId));
        Assert.False(await ReadMustChangePasswordAsync(changedId));

        // Idempotent: nothing new to flag on the second run.
        var second = await superAdmin.PostAsync(MigrationRoute, content: null);
        Assert.Equal(HttpStatusCode.OK, second.StatusCode);

        using var doc = JsonDocument.Parse(await second.Content.ReadAsStringAsync());
        Assert.Equal(0, doc.RootElement.GetProperty("data").GetProperty("flagged").GetInt32());
    }

    [Fact]
    public async Task Resetting_a_student_returns_the_phone_and_forces_a_change()
    {
        var phone = NewPhone();
        var studentPhone = NewPhone();
        var userId = await CreatePortalUserAsync(phone, NewPassword, mustChangePassword: false);

        var student = await CreateStudentLinkedToUserAsync(
            _seed.CenterA, "Reset Phone Child", studentPhone, userId);

        var response = await CenterAdminClient()
            .PutAsync($"Api/V1/Student/reset-password/{student}", content: null);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var data = doc.RootElement.GetProperty("data");
        Assert.Equal(phone, data.GetProperty("temporaryPassword").GetString());

        Assert.True(await SecurityTestSupport.CheckPasswordAsync(_factory, userId, phone));
        Assert.True(await ReadMustChangePasswordAsync(userId));
    }

    private HttpClient CenterAdminClient() =>
        SecurityTestSupport.Client(
            _factory, _seed.CenterOwnerA, AppRoles.CenterOwner, _seed.CenterA);

    private HttpClient AuthorizedClient(string token)
    {
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", token);
        return client;
    }

    private async Task<Guid> CreatePortalUserAsync(
        string phone, string password, bool mustChangePassword)
    {
        return await SecurityTestSupport.CreateUserAsync(
            _factory,
            phone,
            $"{phone}@test.local",
            password,
            role: AppRoles.Student,
            centerId: _seed.CenterA,
            mustChangePassword: mustChangePassword);
    }

    private async Task<Guid> CreateStudentLinkedToUserAsync(
        Guid centerId, string name, string studentPhone, Guid userId)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var student = new Student
        {
            Id = Guid.NewGuid(),
            FullName = name,
            PhoneNumber = studentPhone,
            ParentPhoneNumber = NewPhone(),
            CenterId = centerId,
            UserId = userId,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        db.Students.Add(student);
        await db.SaveChangesAsync();

        return student.Id;
    }

    private async Task<bool> ReadMustChangePasswordAsync(Guid userId)
    {
        using var scope = _factory.Services.CreateScope();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<User>>();
        var user = await userManager.FindByIdAsync(userId.ToString());
        return user?.MustChangePassword ?? false;
    }

    private async Task<bool> RefreshTokenIsRevokedAsync(Guid userId)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var tokens = await db.UserRefreshToken
            .Where(t => t.UserId == userId)
            .OrderBy(t => t.CreatedAt)
            .ToListAsync();

        Assert.Equal(2, tokens.Count);

        // The token minted by SignIn is revoked; the replacement from the
        // password change is the only active one.
        Assert.True(tokens[0].IsRevoked);
        Assert.False(tokens[1].IsRevoked);
        return true;
    }

    private static bool TokenHasForcedChangeClaim(string token)
    {
        var jwt = new JwtSecurityTokenHandler().ReadJwtToken(token);

        return jwt.Claims.Any(c =>
            c.Type == AppPolicies.PasswordChangeRequiredClaim &&
            c.Value == AppPolicies.TrueValue);
    }

    private static string NewPhone() =>
        "0109" + SecurityTestSupport.RandomDigits(7);
}

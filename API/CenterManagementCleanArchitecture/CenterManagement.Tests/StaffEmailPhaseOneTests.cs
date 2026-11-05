using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using CenterManagement.Core.Helpers;
using CenterManagement.Data.AppMetaData;
using CenterManagement.Data.Entities.Identity;
using CenterManagement.Infrustructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace CenterManagement.Tests;

/// <summary>
/// Phase 1 of the optional staff-email feature: admin-entered addresses are
/// normalized, unique system-wide, stored confirmed, and can be omitted or
/// cleared without breaking account creation. Student/parent profiles never
/// expose the address.
/// </summary>
public sealed class StaffEmailPhaseOneTests
{
    private static string UniqueEmail(string prefix = "owner")
        => $"{prefix}.{Guid.NewGuid():N}@example.com";

    private static string UniquePhone()
        => "0109" + SecurityTestSupport.RandomDigits(7);

    private static HttpClient SuperAdmin(ScopeApiFactory factory, SeedResult seed)
        => SecurityTestSupport.Client(factory, Guid.NewGuid(), AppRoles.SuperAdmin, seed.CenterA);

    private static async Task<(Guid CenterId, Guid OwnerId)> OnboardAsync(
        HttpClient admin,
        string phone,
        string? email,
        string? centerName = null)
    {
        var response = await admin.PostAsJsonAsync("Api/V1/Center/CreateWithOwner", new
        {
            accountType = AppRoles.CenterOwner,
            ownerFullName = "Owner " + phone,
            ownerPhone = phone,
            ownerPassword = "Owner@12345",
            centerName = centerName ?? $"Center {phone}",
            ownerEmail = email
        });

        var body = await response.Content.ReadAsStringAsync();
        Assert.True(response.IsSuccessStatusCode, body);

        using var document = JsonDocument.Parse(body);
        Assert.True(document.RootElement.GetProperty("succeeded").GetBoolean(), body);

        var data = document.RootElement.GetProperty("data");
        return (data.GetProperty("centerId").GetGuid(), data.GetProperty("ownerId").GetGuid());
    }

    private static async Task<User> ReadUserAsync(ScopeApiFactory factory, Guid userId)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        return await db.Users.SingleAsync(user => user.Id == userId);
    }

    private static async Task<User> ReadUserByPhoneAsync(ScopeApiFactory factory, string phone)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        return await db.Users.SingleAsync(user => user.PhoneNumber == phone);
    }

    private static async Task<bool> UserExistsAsync(ScopeApiFactory factory, string phone)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        return await db.Users.AnyAsync(user => user.PhoneNumber == phone);
    }

    private static async Task<JsonDocument> ReadJsonAsync(HttpResponseMessage response)
        => JsonDocument.Parse(await response.Content.ReadAsStringAsync());

    // ---------------- onboarding ----------------

    [Fact]
    public async Task Onboarding_stores_admin_email_normalized_and_confirmed()
    {
        using var factory = new ScopeApiFactory();
        var seed = factory.EnsureSeeded();
        var admin = SuperAdmin(factory, seed);

        var email = UniqueEmail();
        var phone = UniquePhone();

        var (centerId, ownerId) = await OnboardAsync(
            admin,
            phone,
            "  " + email.ToUpperInvariant() + "  ");

        var owner = await ReadUserAsync(factory, ownerId);

        Assert.Equal(email, owner.Email);
        Assert.Equal(email.ToUpperInvariant(), owner.NormalizedEmail);
        Assert.True(owner.EmailConfirmed);
        Assert.Equal(centerId, owner.CenterId);
    }

    [Fact]
    public async Task Onboarding_without_email_keeps_it_optional()
    {
        using var factory = new ScopeApiFactory();
        var seed = factory.EnsureSeeded();
        var admin = SuperAdmin(factory, seed);

        var (_, ownerId) = await OnboardAsync(admin, UniquePhone(), email: null);

        var owner = await ReadUserAsync(factory, ownerId);

        Assert.Null(owner.Email);
        Assert.Null(owner.NormalizedEmail);
        Assert.False(owner.EmailConfirmed);
    }

    [Fact]
    public async Task Onboarding_rejects_invalid_email()
    {
        using var factory = new ScopeApiFactory();
        var seed = factory.EnsureSeeded();
        var admin = SuperAdmin(factory, seed);

        var phone = UniquePhone();
        // The FluentValidation pipeline rejects the malformed address before
        // the handler runs (the same behaviour the existing subject test
        // asserts), so the request never reaches the database.
        var exception = await Assert.ThrowsAsync<FluentValidation.ValidationException>(() =>
            admin.PostAsJsonAsync("Api/V1/Center/CreateWithOwner", new
            {
                accountType = AppRoles.CenterOwner,
                ownerFullName = "Invalid Email Owner",
                ownerPhone = phone,
                ownerPassword = "Owner@12345",
                centerName = "Invalid Email Center",
                ownerEmail = "not-an-email"
            }));

        Assert.Contains(UserEmailHelper.InvalidMessage, exception.Message);
        Assert.False(await UserExistsAsync(factory, phone));
    }

    [Fact]
    public async Task Onboarding_rejects_duplicate_email_without_naming_the_owner()
    {
        using var factory = new ScopeApiFactory();
        var seed = factory.EnsureSeeded();
        var admin = SuperAdmin(factory, seed);

        var email = UniqueEmail();
        var firstPhone = UniquePhone();
        await OnboardAsync(admin, firstPhone, email);

        var secondPhone = UniquePhone();
        var response = await admin.PostAsJsonAsync("Api/V1/Center/CreateWithOwner", new
        {
            accountType = AppRoles.CenterOwner,
            ownerFullName = "Second Owner",
            ownerPhone = secondPhone,
            ownerPassword = "Owner@12345",
            centerName = "Second Center",
            ownerEmail = email.ToUpperInvariant()
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        using var document = await ReadJsonAsync(response);
        var body = document.RootElement.GetRawText();
        Assert.Contains(UserEmailHelper.DuplicateMessage, body);
        Assert.DoesNotContain(firstPhone, body);
        Assert.DoesNotContain("Owner " + firstPhone, body);
        Assert.False(await UserExistsAsync(factory, secondPhone));

        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        Assert.Equal(1, await db.Users.CountAsync(user => user.NormalizedEmail == email.ToUpperInvariant()));
    }

    // ---------------- teachers ----------------

    [Fact]
    public async Task Add_teacher_stores_email_normalized_and_confirmed()
    {
        using var factory = new ScopeApiFactory();
        var seed = factory.EnsureSeeded();
        var owner = SecurityTestSupport.CenterAdminClient(factory, seed.CenterOwnerA, seed.CenterA);

        var phone = UniquePhone();
        var email = UniqueEmail("teacher");

        var response = await owner.PostAsJsonAsync("Api/V1/Teacher/Create", new
        {
            fullName = "Email Teacher",
            phoneNumber = phone,
            password = "Temp123!",
            confirmPassword = "Temp123!",
            subject = "Math",
            email = "  " + email.ToUpperInvariant() + "  "
        });

        Assert.True(response.IsSuccessStatusCode, await response.Content.ReadAsStringAsync());

        var teacher = await ReadUserByPhoneAsync(factory, phone);
        Assert.Equal(email, teacher.Email);
        Assert.Equal(email.ToUpperInvariant(), teacher.NormalizedEmail);
        Assert.True(teacher.EmailConfirmed);
        Assert.Equal(seed.CenterA, teacher.CenterId);

        // The edit form is populated from the paginated list, so the address
        // must travel back out to the owner as well.
        var list = await owner.GetAsync(
            $"Api/V1/Teacher/Paginated?pageNumber=1&pageSize=50&search={phone}");
        Assert.True(list.IsSuccessStatusCode, await list.Content.ReadAsStringAsync());

        using var listDocument = await ReadJsonAsync(list);
        var row = Assert.Single(
            listDocument.RootElement.GetProperty("data").GetProperty("data")
                .EnumerateArray(),
            item => item.GetProperty("id").GetGuid() == teacher.Id);
        Assert.Equal(email, row.GetProperty("email").GetString());
    }

    [Fact]
    public async Task Add_teacher_without_email_keeps_it_optional()
    {
        using var factory = new ScopeApiFactory();
        var seed = factory.EnsureSeeded();
        var owner = SecurityTestSupport.CenterAdminClient(factory, seed.CenterOwnerA, seed.CenterA);

        var phone = UniquePhone();
        var response = await owner.PostAsJsonAsync("Api/V1/Teacher/Create", new
        {
            fullName = "No Email Teacher",
            phoneNumber = phone,
            password = "Temp123!",
            confirmPassword = "Temp123!",
            subject = "Math"
        });

        Assert.True(response.IsSuccessStatusCode, await response.Content.ReadAsStringAsync());

        var teacher = await ReadUserByPhoneAsync(factory, phone);
        Assert.Null(teacher.Email);
        Assert.False(teacher.EmailConfirmed);
    }

    [Fact]
    public async Task Add_teacher_rejects_invalid_and_duplicate_email()
    {
        using var factory = new ScopeApiFactory();
        var seed = factory.EnsureSeeded();
        var owner = SecurityTestSupport.CenterAdminClient(factory, seed.CenterOwnerA, seed.CenterA);

        var invalidPhone = UniquePhone();
        var invalid = await Assert.ThrowsAsync<FluentValidation.ValidationException>(() =>
            owner.PostAsJsonAsync("Api/V1/Teacher/Create", new
            {
                fullName = "Invalid Email Teacher",
                phoneNumber = invalidPhone,
                password = "Temp123!",
                confirmPassword = "Temp123!",
                subject = "Math",
                email = "invalid-email"
            }));

        Assert.Contains(UserEmailHelper.InvalidMessage, invalid.Message);
        Assert.False(await UserExistsAsync(factory, invalidPhone));

        var email = UniqueEmail("duplicate");
        var firstPhone = UniquePhone();
        var first = await owner.PostAsJsonAsync("Api/V1/Teacher/Create", new
        {
            fullName = "First Email Teacher",
            phoneNumber = firstPhone,
            password = "Temp123!",
            confirmPassword = "Temp123!",
            subject = "Math",
            email = email
        });
        Assert.True(first.IsSuccessStatusCode, await first.Content.ReadAsStringAsync());

        var secondPhone = UniquePhone();
        var duplicate = await owner.PostAsJsonAsync("Api/V1/Teacher/Create", new
        {
            fullName = "Second Email Teacher",
            phoneNumber = secondPhone,
            password = "Temp123!",
            confirmPassword = "Temp123!",
            subject = "Math",
            email = email.ToUpperInvariant()
        });

        Assert.Equal(HttpStatusCode.BadRequest, duplicate.StatusCode);
        Assert.Contains(UserEmailHelper.DuplicateMessage,
            (await ReadJsonAsync(duplicate)).RootElement.GetRawText());
        Assert.False(await UserExistsAsync(factory, secondPhone));
    }

    [Fact]
    public async Task Edit_teacher_updates_keeps_and_clears_email()
    {
        using var factory = new ScopeApiFactory();
        var seed = factory.EnsureSeeded();
        var owner = SecurityTestSupport.CenterAdminClient(factory, seed.CenterOwnerA, seed.CenterA);

        var phone = UniquePhone();
        var original = UniqueEmail("original");
        var create = await owner.PostAsJsonAsync("Api/V1/Teacher/Create", new
        {
            fullName = "Editable Teacher",
            phoneNumber = phone,
            password = "Temp123!",
            confirmPassword = "Temp123!",
            subject = "Math",
            email = original
        });
        Assert.True(create.IsSuccessStatusCode, await create.Content.ReadAsStringAsync());

        var teacher = await ReadUserByPhoneAsync(factory, phone);

        var replacement = UniqueEmail("replacement");
        var update = await owner.PutAsJsonAsync("Api/V1/Teacher/Edit", new
        {
            id = teacher.Id,
            fullName = "Editable Teacher Updated",
            email = "  " + replacement.ToUpperInvariant() + "  "
        });
        Assert.True(update.IsSuccessStatusCode, await update.Content.ReadAsStringAsync());

        teacher = await ReadUserAsync(factory, teacher.Id);
        Assert.Equal(replacement, teacher.Email);
        Assert.True(teacher.EmailConfirmed);

        // A missing email member means "leave it alone".
        var untouched = await owner.PutAsJsonAsync("Api/V1/Teacher/Edit", new
        {
            id = teacher.Id,
            fullName = "Editable Teacher Updated"
        });
        Assert.True(untouched.IsSuccessStatusCode, await untouched.Content.ReadAsStringAsync());

        teacher = await ReadUserAsync(factory, teacher.Id);
        Assert.Equal(replacement, teacher.Email);

        // An explicit empty string clears it.
        var cleared = await owner.PutAsJsonAsync("Api/V1/Teacher/Edit", new
        {
            id = teacher.Id,
            fullName = "Editable Teacher Updated",
            email = ""
        });
        Assert.True(cleared.IsSuccessStatusCode, await cleared.Content.ReadAsStringAsync());

        teacher = await ReadUserAsync(factory, teacher.Id);
        Assert.Null(teacher.Email);
        Assert.Null(teacher.NormalizedEmail);
        Assert.False(teacher.EmailConfirmed);
    }

    // ---------------- assistants ----------------

    [Fact]
    public async Task Assistant_email_is_optional_confirmed_and_editable()
    {
        using var factory = new ScopeApiFactory();
        var seed = factory.EnsureSeeded();
        var owner = SecurityTestSupport.CenterAdminClient(factory, seed.CenterOwnerA, seed.CenterA);

        var email = UniqueEmail("assistant");
        var phone = UniquePhone();
        var create = await owner.PostAsJsonAsync("Api/V1/Assistant/Create", new
        {
            fullName = "Email Assistant",
            phoneNumber = phone,
            password = "Temp123!",
            confirmPassword = "Temp123!",
            salary = 1000,
            email = "  " + email.ToUpperInvariant() + "  "
        });
        Assert.True(create.IsSuccessStatusCode, await create.Content.ReadAsStringAsync());

        var assistant = await ReadUserByPhoneAsync(factory, phone);
        Assert.Equal(email, assistant.Email);
        Assert.True(assistant.EmailConfirmed);

        var list = await owner.GetAsync(
            $"Api/V1/Assistant/Paginated?pageNumber=1&pageSize=50&search={phone}");
        Assert.True(list.IsSuccessStatusCode, await list.Content.ReadAsStringAsync());

        using var listDocument = await ReadJsonAsync(list);
        var row = Assert.Single(
            listDocument.RootElement.GetProperty("data").GetProperty("data")
                .EnumerateArray(),
            item => item.GetProperty("id").GetGuid() == assistant.Id);
        Assert.Equal(email, row.GetProperty("email").GetString());

        var noEmailPhone = UniquePhone();
        var withoutEmail = await owner.PostAsJsonAsync("Api/V1/Assistant/Create", new
        {
            fullName = "No Email Assistant",
            phoneNumber = noEmailPhone,
            password = "Temp123!",
            confirmPassword = "Temp123!",
            salary = 1000
        });
        Assert.True(withoutEmail.IsSuccessStatusCode, await withoutEmail.Content.ReadAsStringAsync());

        var noEmailAssistant = await ReadUserByPhoneAsync(factory, noEmailPhone);
        Assert.Null(noEmailAssistant.Email);
        Assert.False(noEmailAssistant.EmailConfirmed);

        var replacement = UniqueEmail("assistant2");
        var edit = await owner.PutAsJsonAsync("Api/V1/Assistant/Edit", new
        {
            id = assistant.Id,
            fullName = "Email Assistant Updated",
            phoneNumber = phone,
            salary = 1200,
            isActive = true,
            email = replacement.ToUpperInvariant()
        });
        Assert.True(edit.IsSuccessStatusCode, await edit.Content.ReadAsStringAsync());

        assistant = await ReadUserAsync(factory, assistant.Id);
        Assert.Equal(replacement, assistant.Email);
        Assert.True(assistant.EmailConfirmed);

        var clear = await owner.PutAsJsonAsync("Api/V1/Assistant/Edit", new
        {
            id = assistant.Id,
            fullName = "Email Assistant Updated",
            phoneNumber = phone,
            salary = 1200,
            isActive = true,
            email = ""
        });
        Assert.True(clear.IsSuccessStatusCode, await clear.Content.ReadAsStringAsync());

        assistant = await ReadUserAsync(factory, assistant.Id);
        Assert.Null(assistant.Email);
        Assert.False(assistant.EmailConfirmed);
    }

    // ---------------- center edit / owner email ----------------

    [Fact]
    public async Task Center_edit_updates_owner_email_and_exposes_it_in_admin_views()
    {
        using var factory = new ScopeApiFactory();
        var seed = factory.EnsureSeeded();
        var admin = SuperAdmin(factory, seed);

        var phone = UniquePhone();
        var (centerId, ownerId) = await OnboardAsync(admin, phone, email: null);

        var email = UniqueEmail("centerowner");
        var update = await admin.PutAsJsonAsync("Api/V1/Center/Edit", new
        {
            id = centerId,
            name = $"Center {phone}",
            ownerEmail = "  " + email.ToUpperInvariant() + "  "
        });
        Assert.True(update.IsSuccessStatusCode, await update.Content.ReadAsStringAsync());

        var owner = await ReadUserAsync(factory, ownerId);
        Assert.Equal(email, owner.Email);
        Assert.True(owner.EmailConfirmed);

        var detail = await admin.GetAsync($"Api/V1/Center/{centerId}");
        Assert.True(detail.IsSuccessStatusCode, await detail.Content.ReadAsStringAsync());

        using var detailDocument = await ReadJsonAsync(detail);
        Assert.Equal(
            email,
            detailDocument.RootElement
                .GetProperty("data")
                .GetProperty("ownerEmail")
                .GetString());

        var list = await admin.GetAsync(
            $"Api/V1/Center/Paginated?pageNumber=1&pageSize=50&search={Uri.EscapeDataString(phone)}");
        Assert.True(list.IsSuccessStatusCode, await list.Content.ReadAsStringAsync());

        using var listDocument = await ReadJsonAsync(list);
        var items = listDocument.RootElement
            .GetProperty("data")
            .GetProperty("data")
            .EnumerateArray()
            .ToList();

        var item = Assert.Single(items, entry => entry.GetProperty("id").GetGuid() == centerId);
        Assert.Equal(email, item.GetProperty("ownerEmail").GetString());
    }

    [Fact]
    public async Task Center_edit_rejects_another_owners_duplicate_email()
    {
        using var factory = new ScopeApiFactory();
        var seed = factory.EnsureSeeded();
        var admin = SuperAdmin(factory, seed);

        var email = UniqueEmail("owned");
        await OnboardAsync(admin, UniquePhone(), email);

        var secondPhone = UniquePhone();
        var (secondCenterId, _) = await OnboardAsync(admin, secondPhone, email: null);

        var response = await admin.PutAsJsonAsync("Api/V1/Center/Edit", new
        {
            id = secondCenterId,
            name = $"Center {secondPhone}",
            ownerEmail = email.ToUpperInvariant()
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Contains(UserEmailHelper.DuplicateMessage,
            (await ReadJsonAsync(response)).RootElement.GetRawText());
    }

    // ---------------- profile exposure ----------------

    [Fact]
    public async Task Profile_hides_email_for_students_and_parents_but_returns_it_for_staff()
    {
        using var factory = new ScopeApiFactory();
        var seed = factory.EnsureSeeded();

        var studentEmail = UniqueEmail("student");
        var studentId = await SecurityTestSupport.CreateUserAsync(
            factory, UniquePhone(), studentEmail, role: AppRoles.Student, centerId: seed.CenterA);

        var parentEmail = UniqueEmail("parent");
        var parentId = await SecurityTestSupport.CreateUserAsync(
            factory, UniquePhone(), parentEmail, role: AppRoles.Parent, centerId: seed.CenterA);

        var teacherEmail = UniqueEmail("teacherprofile");
        var teacherId = await SecurityTestSupport.CreateUserAsync(
            factory, UniquePhone(), teacherEmail, role: AppRoles.Teacher, centerId: seed.CenterA);

        async Task<JsonElement> GetProfileAsync(Guid userId, string role)
        {
            var client = SecurityTestSupport.Client(factory, userId, role, seed.CenterA);
            var response = await client.GetAsync("Api/V1/Profile/GetMyProfile");
            Assert.True(response.IsSuccessStatusCode, await response.Content.ReadAsStringAsync());

            using var document = await ReadJsonAsync(response);
            return document.RootElement.GetProperty("data").Clone();
        }

        var studentProfile = await GetProfileAsync(studentId, AppRoles.Student);
        var parentProfile = await GetProfileAsync(parentId, AppRoles.Parent);
        var teacherProfile = await GetProfileAsync(teacherId, AppRoles.Teacher);

        Assert.Equal(JsonValueKind.Null, studentProfile.GetProperty("email").ValueKind);
        Assert.Equal(JsonValueKind.Null, parentProfile.GetProperty("email").ValueKind);
        Assert.Equal(teacherEmail, teacherProfile.GetProperty("email").GetString());
    }
}

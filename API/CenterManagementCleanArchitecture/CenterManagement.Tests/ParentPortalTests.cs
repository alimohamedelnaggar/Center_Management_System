using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Net.Http.Headers;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using CenterManagement.Data.AppMetaData;
using CenterManagement.Data.Entities;
using CenterManagement.Data.Entities.Abstractions;
using CenterManagement.Data.Entities.Groups;
using CenterManagement.Data.Entities.Identity;
using CenterManagement.Data.Entities.QuestionBank;
using CenterManagement.Data.Entities.Users;
using CenterManagement.Data.Enums;
using CenterManagement.Infrustructure.Data;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;

namespace CenterManagement.Tests;

/// <summary>
/// Covers the parent portal module (Phase A): a parent only ever sees his own
/// children, the module gates the endpoint, other roles are rejected, and the
/// staff-initiated "create parent account" flow creates/reuses an account and
/// links the student while refusing cross-role and cross-center phones.
/// </summary>
public sealed class ParentPortalTests : IClassFixture<ScopeApiFactory>
{
    private static long _phoneSeed = DateTime.UtcNow.Ticks;

    private readonly ScopeApiFactory _factory;
    private readonly SeedResult _seed;

    public ParentPortalTests(ScopeApiFactory factory)
    {
        _factory = factory;
        _seed = _factory.EnsureSeeded();
    }

    // ---------------- isolation ----------------

    [Fact]
    public async Task Parent_Sees_Only_Own_Children()
    {
        var (parent1, child1) = await CreateParentWithChildAsync(_seed.CenterA, "Child One");
        var (_, _) = await CreateParentWithChildAsync(_seed.CenterA, "Child Two");

        var response = await Client(AppRoles.Parent, isCenterAdmin: false, subjectOverride: parent1)
            .GetAsync(Routing.ParentPortalRouting.Children);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var data = doc.RootElement.GetProperty("data");

        Assert.Equal(1, data.GetArrayLength());
        Assert.Equal(child1.ToString(), data[0].GetProperty("studentId").GetString());
        Assert.Equal("Child One", data[0].GetProperty("fullName").GetString());
    }

    // ---------------- module gate ----------------

    [Fact]
    public async Task ParentPortal_Module_Gates_Children_Endpoint()
    {
        var (parent, _) = await CreateParentWithChildAsync(_seed.CenterA, "Gated Child");

        SetModule(_seed.CenterA, ModuleKeys.ParentPortal, false);
        var disabled = await Client(AppRoles.Parent, isCenterAdmin: false, subjectOverride: parent)
            .GetAsync(Routing.ParentPortalRouting.Children);

        Assert.Equal(HttpStatusCode.Forbidden, disabled.StatusCode);
        Assert.Contains(ModuleAccessCodes.ModuleDisabled, await disabled.Content.ReadAsStringAsync());

        SetModule(_seed.CenterA, ModuleKeys.ParentPortal, true);
        var enabled = await Client(AppRoles.Parent, isCenterAdmin: false, subjectOverride: parent)
            .GetAsync(Routing.ParentPortalRouting.Children);

        Assert.Equal(HttpStatusCode.OK, enabled.StatusCode);
    }

    // ---------------- role gate ----------------

    [Fact]
    public async Task NonParent_Role_Is_Forbidden()
    {
        var response = await Client(AppRoles.Teacher, isCenterAdmin: false)
            .GetAsync(Routing.ParentPortalRouting.Children);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    // ---------------- create parent account ----------------

    [Fact]
    public async Task CreateParentAccount_Creates_Account_And_Links_Student()
    {
        var parentPhone = NewPhone();
        var studentId = await CreateStudentAsync(_seed.CenterA, "New Parent Child", parentPhone);

        var response = await CenterAdmin().PostAsync(
            RouteCreateParentAccount(studentId),
            content: null);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var data = doc.RootElement.GetProperty("data");

        Assert.Equal(studentId.ToString(), data.GetProperty("studentId").GetString());
        Assert.Equal(parentPhone, data.GetProperty("parentPhone").GetString());
        Assert.False(data.GetProperty("linkedExistingAccount").GetBoolean());
        Assert.Equal(parentPhone, data.GetProperty("temporaryPassword").GetString());

        // The parent now exists, holds the Parent role, sits in the same center,
        // and exactly one link row was created.
        var parent = await FindUserByPhoneAsync(parentPhone);
        Assert.NotNull(parent);
        Assert.Equal(_seed.CenterA, parent!.CenterId);
        Assert.True(await IsInRoleAsync(parent.Id, AppRoles.Parent));

        Assert.Equal(1, await CountLinksAsync(parent.Id, studentId));
    }

    [Fact]
    public async Task CreateParentAccount_Is_Idempotent_And_Reuses_Existing_Account()
    {
        var parentPhone = NewPhone();
        var studentId = await CreateStudentAsync(_seed.CenterA, "Reuse Child", parentPhone);

        var first = await CenterAdmin().PostAsync(RouteCreateParentAccount(studentId), content: null);
        Assert.Equal(HttpStatusCode.OK, first.StatusCode);

        var second = await CenterAdmin().PostAsync(RouteCreateParentAccount(studentId), content: null);
        Assert.Equal(HttpStatusCode.OK, second.StatusCode);

        using var doc = JsonDocument.Parse(await second.Content.ReadAsStringAsync());
        var data = doc.RootElement.GetProperty("data");

        Assert.True(data.GetProperty("linkedExistingAccount").GetBoolean());
        Assert.Equal(JsonValueKind.Null, data.GetProperty("temporaryPassword").ValueKind);

        var parent = await FindUserByPhoneAsync(parentPhone);
        Assert.NotNull(parent);

        // Still a single link — the second call did not duplicate it.
        Assert.Equal(1, await CountLinksAsync(parent!.Id, studentId));
    }

    [Fact]
    public async Task CreateParentAccount_Rejects_Phone_Used_By_Another_Role()
    {
        var phone = NewPhone();
        await CreateUserAsync(_seed.CenterA, "Not A Parent", phone, AppRoles.Teacher);
        var studentId = await CreateStudentAsync(_seed.CenterA, "Wrong Role Child", phone);

        var response = await CenterAdmin().PostAsync(RouteCreateParentAccount(studentId), content: null);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal(0, await CountLinksForStudentAsync(studentId));
    }

    [Fact]
    public async Task CreateParentAccount_Rejects_Phone_From_Another_Center()
    {
        var phone = NewPhone();
        await CreateUserAsync(_seed.CenterB, "Foreign Parent", phone, AppRoles.Parent);
        var studentId = await CreateStudentAsync(_seed.CenterA, "Foreign Parent Child", phone);

        var response = await CenterAdmin().PostAsync(RouteCreateParentAccount(studentId), content: null);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal(0, await CountLinksForStudentAsync(studentId));
    }

    // ---------------- bulk create parent accounts ----------------

    [Fact]
    public async Task BulkCreateParentAccounts_Creates_One_Account_Per_Student_In_Group()
    {
        var groupId = await CreateGroupAsync(_seed.CenterA, "Bulk Group A");
        var phone1 = NewPhone();
        var phone2 = NewPhone();

        var student1 = await CreateStudentInGroupAsync(_seed.CenterA, groupId, "Bulk Child One", phone1);
        var student2 = await CreateStudentInGroupAsync(_seed.CenterA, groupId, "Bulk Child Two", phone2);

        var response = await CenterAdmin().PostAsync(
            RouteBulkCreateParentAccounts(),
            BulkPayload(new { groupId = groupId.ToString(), isActive = true }));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var data = doc.RootElement.GetProperty("data");

        var created = data.GetProperty("created").EnumerateArray().ToList();
        var linked = data.GetProperty("linked").EnumerateArray().ToList();
        var skipped = data.GetProperty("skipped").EnumerateArray().ToList();

        Assert.Equal(2, created.Count);
        Assert.Empty(linked);
        Assert.Empty(skipped);

        foreach (var item in created)
        {
            Assert.Equal(item.GetProperty("parentPhone").GetString(), item.GetProperty("temporaryPassword").GetString());
            Assert.Equal(item.GetProperty("parentPhone").GetString(), item.GetProperty("username").GetString());
        }

        // Both parents really exist, hold the Parent role and are linked.
        var parent1 = await FindUserByPhoneAsync(phone1);
        var parent2 = await FindUserByPhoneAsync(phone2);

        Assert.NotNull(parent1);
        Assert.NotNull(parent2);
        Assert.True(await IsInRoleAsync(parent1!.Id, AppRoles.Parent));
        Assert.Equal(1, await CountLinksAsync(parent1.Id, student1));
        Assert.Equal(1, await CountLinksAsync(parent2!.Id, student2));

        // The printable "all students" list carries every processed student,
        // with the parent phone and the one-time password.
        var all = data.GetProperty("all").EnumerateArray().ToList();
        Assert.Equal(2, all.Count);
        Assert.Contains(all, row =>
            row.GetProperty("studentId").GetString() == student1.ToString() &&
            row.GetProperty("parentPhone").GetString() == phone1 &&
            row.GetProperty("temporaryPassword").GetString() == phone1);
        Assert.Contains(all, row =>
            row.GetProperty("studentId").GetString() == student2.ToString() &&
            row.GetProperty("parentPhone").GetString() == phone2);
    }

    [Fact]
    public async Task GenerateStudentAccounts_Uses_Phone_As_Username_And_Password()
    {
        var phone = NewPhone();
        var studentId = await CreateStudentAsync(_seed.CenterA, "Phone Login Child", phone, studentPhone: phone);

        var response = await CenterAdmin()
            .PostAsync(Routing.StudentRouting.GenerateAccounts, content: null);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var all = doc.RootElement.GetProperty("data").GetProperty("all")
            .EnumerateArray()
            .First(row => row.GetProperty("studentId").GetString() == studentId.ToString());

        Assert.Equal(phone, all.GetProperty("phone").GetString());
        Assert.Equal(phone, all.GetProperty("username").GetString());
        Assert.Equal(phone, all.GetProperty("temporaryPassword").GetString());

        var user = await FindUserByPhoneAsync(phone);
        Assert.NotNull(user);
        Assert.True(await SecurityTestSupport.CheckPasswordAsync(_factory, user!.Id, phone));
    }

    [Fact]
    public async Task BulkCreateParentAccounts_Links_Siblings_To_The_Same_Existing_Account()
    {
        var groupId = await CreateGroupAsync(_seed.CenterA, "Bulk Siblings Group");
        var phone = NewPhone();

        await CreateStudentInGroupAsync(_seed.CenterA, groupId, "Sibling One", phone);
        await CreateStudentInGroupAsync(_seed.CenterA, groupId, "Sibling Two", phone);

        var response = await CenterAdmin().PostAsync(
            RouteBulkCreateParentAccounts(),
            BulkPayload(new { groupId = groupId.ToString() }));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var data = doc.RootElement.GetProperty("data");

        Assert.Equal(1, data.GetProperty("created").GetArrayLength());
        Assert.Equal(1, data.GetProperty("linked").GetArrayLength());
        Assert.Equal(0, data.GetProperty("skipped").GetArrayLength());

        // The reused account carries no new password.
        var linkedItem = data.GetProperty("linked")[0];
        Assert.Equal(JsonValueKind.Null, linkedItem.GetProperty("temporaryPassword").ValueKind);
        Assert.True(linkedItem.GetProperty("linkedExistingAccount").GetBoolean());

        // Only one user exists for that phone, and both children are linked to him.
        var parent = await FindUserByPhoneAsync(phone);
        Assert.NotNull(parent);
        Assert.Equal(2, await CountLinksForParentAsync(parent!.Id));
    }

    [Fact]
    public async Task BulkCreateParentAccounts_Skips_Students_That_Cannot_Be_Processed()
    {
        var groupId = await CreateGroupAsync(_seed.CenterA, "Bulk Skips Group");

        // No parent phone at all.
        await CreateStudentInGroupAsync(_seed.CenterA, groupId, "No Phone Child", string.Empty);

        // The phone already belongs to a non-parent account.
        var teacherPhone = NewPhone();
        await CreateUserAsync(_seed.CenterA, "Not A Parent", teacherPhone, AppRoles.Teacher);
        await CreateStudentInGroupAsync(_seed.CenterA, groupId, "Wrong Role Child", teacherPhone);

        // The phone belongs to a parent of another center.
        var foreignPhone = NewPhone();
        await CreateUserAsync(_seed.CenterB, "Foreign Parent", foreignPhone, AppRoles.Parent);
        await CreateStudentInGroupAsync(_seed.CenterA, groupId, "Foreign Child", foreignPhone);

        var response = await CenterAdmin().PostAsync(
            RouteBulkCreateParentAccounts(),
            BulkPayload(new { groupId = groupId.ToString() }));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var data = doc.RootElement.GetProperty("data");

        Assert.Equal(0, data.GetProperty("created").GetArrayLength());
        Assert.Equal(0, data.GetProperty("linked").GetArrayLength());

        var skipped = data.GetProperty("skipped").EnumerateArray().ToList();
        Assert.Equal(3, skipped.Count);

        var reasons = skipped.Select(s => s.GetProperty("reason").GetString()).ToList();
        Assert.Contains(reasons, r => r!.Contains("لا يوجد رقم هاتف"));
        Assert.Contains(reasons, r => r!.Contains("لحساب آخر"));
        Assert.Contains(reasons, r => r!.Contains("مركز آخر"));
    }

    [Fact]
    public async Task BulkCreateParentAccounts_Is_Idempotent()
    {
        var groupId = await CreateGroupAsync(_seed.CenterA, "Bulk Idempotent Group");
        var phone = NewPhone();

        await CreateStudentInGroupAsync(_seed.CenterA, groupId, "Idempotent Child", phone);

        var first = await CenterAdmin().PostAsync(
            RouteBulkCreateParentAccounts(),
            BulkPayload(new { groupId = groupId.ToString() }));

        Assert.Equal(HttpStatusCode.OK, first.StatusCode);

        var second = await CenterAdmin().PostAsync(
            RouteBulkCreateParentAccounts(),
            BulkPayload(new { groupId = groupId.ToString() }));

        Assert.Equal(HttpStatusCode.OK, second.StatusCode);

        using var doc = JsonDocument.Parse(await second.Content.ReadAsStringAsync());
        var data = doc.RootElement.GetProperty("data");

        // The second run creates nothing new: it only reports the existing account.
        Assert.Equal(0, data.GetProperty("created").GetArrayLength());
        Assert.Equal(1, data.GetProperty("linked").GetArrayLength());

        var parent = await FindUserByPhoneAsync(phone);
        Assert.NotNull(parent);
        Assert.Equal(1, await CountLinksForParentAsync(parent!.Id));
    }

    [Fact]
    public async Task BulkCreateParentAccounts_SkipAlreadyLinked_Leaves_Linked_Students_Alone()
    {
        var groupId = await CreateGroupAsync(_seed.CenterA, "Bulk Skip Linked Group");
        var phone = NewPhone();

        var studentId = await CreateStudentInGroupAsync(_seed.CenterA, groupId, "Already Linked Child", phone);

        // The account already exists and the student is already linked to it.
        var parentId = await CreateUserAsync(_seed.CenterA, "Existing Parent", phone, AppRoles.Parent);
        await LinkAsync(parentId, studentId);

        var response = await CenterAdmin().PostAsync(
            RouteBulkCreateParentAccounts(),
            BulkPayload(new { groupId = groupId.ToString(), skipAlreadyLinked = true }));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var data = doc.RootElement.GetProperty("data");

        Assert.Equal(0, data.GetProperty("created").GetArrayLength());
        Assert.Equal(0, data.GetProperty("linked").GetArrayLength());
        Assert.Equal(0, data.GetProperty("skipped").GetArrayLength());
    }

    [Fact]
    public async Task BulkCreateParentAccounts_Only_Touches_The_Requested_Group()
    {
        var groupA = await CreateGroupAsync(_seed.CenterA, "Bulk Isolated A");
        var groupB = await CreateGroupAsync(_seed.CenterA, "Bulk Isolated B");

        var phoneA = NewPhone();
        var phoneB = NewPhone();

        await CreateStudentInGroupAsync(_seed.CenterA, groupA, "Isolated A Child", phoneA);
        await CreateStudentInGroupAsync(_seed.CenterA, groupB, "Isolated B Child", phoneB);

        var response = await CenterAdmin().PostAsync(
            RouteBulkCreateParentAccounts(),
            BulkPayload(new { groupId = groupA.ToString() }));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var data = doc.RootElement.GetProperty("data");

        Assert.Equal(1, data.GetProperty("created").GetArrayLength());

        // The other group was left alone.
        Assert.NotNull(await FindUserByPhoneAsync(phoneA));
        Assert.Null(await FindUserByPhoneAsync(phoneB));
    }

    [Fact]
    public async Task BulkCreateParentAccounts_Module_Gates_The_Endpoint()
    {
        SetModule(_seed.CenterA, ModuleKeys.ParentPortal, false);

        var response = await CenterAdmin().PostAsync(
            RouteBulkCreateParentAccounts(),
            BulkPayload(new { }));

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        Assert.Contains(ModuleAccessCodes.ModuleDisabled, await response.Content.ReadAsStringAsync());

        SetModule(_seed.CenterA, ModuleKeys.ParentPortal, true);
    }

    [Fact]
    public async Task BulkCreateParentAccounts_Non_CenterAdmin_Is_Forbidden()
    {
        var response = await Client(AppRoles.Teacher, isCenterAdmin: false)
            .PostAsync(RouteBulkCreateParentAccounts(), BulkPayload(new { }));

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    // ---------------- child sections (Phase B) ----------------

    [Fact]
    public async Task Child_Sections_UnlinkedStudent_Return_NotFound()
    {
        var (parent, _) = await CreateParentWithChildAsync(_seed.CenterA, "Linked Child");
        var otherChild = await CreateStudentAsync(_seed.CenterA, "Not My Child", NewPhone());

        var client = Client(AppRoles.Parent, isCenterAdmin: false, subjectOverride: parent);

        foreach (var route in ChildSectionRoutes(otherChild))
        {
            var response = await client.GetAsync(route);
            Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        }
    }

    [Fact]
    public async Task Child_Sections_StudentFromAnotherCenter_Return_NotFound()
    {
        var (parent, _) = await CreateParentWithChildAsync(_seed.CenterA, "Center A Child");
        var foreignChild = await CreateStudentAsync(_seed.CenterB, "Center B Child", NewPhone());

        var client = Client(AppRoles.Parent, isCenterAdmin: false, subjectOverride: parent);

        foreach (var route in ChildSectionRoutes(foreignChild))
        {
            var response = await client.GetAsync(route);
            Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        }
    }

    [Fact]
    public async Task Child_LinkCheck_Precedes_LockedSection_Module()
    {
        // Unlinked student AND the grades section switched off: the link check
        // must win, so the answer is 404 (existence of the student is not revealed).
        var (parent, _) = await CreateParentWithChildAsync(_seed.CenterA, "Linked Child 2");
        var otherChild = await CreateStudentAsync(_seed.CenterA, "Unlinked Child 2", NewPhone());

        SetModule(_seed.CenterA, ModuleKeys.Grades, false);

        var response = await Client(AppRoles.Parent, isCenterAdmin: false, subjectOverride: parent)
            .GetAsync(RouteChildGrades(otherChild));

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Child_LockedSection_Returns_Forbidden_WhenLinked()
    {
        var (parent, child) = await CreateParentWithChildAsync(_seed.CenterA, "Linked Child 3");

        SetModule(_seed.CenterA, ModuleKeys.Grades, false);

        var response = await Client(AppRoles.Parent, isCenterAdmin: false, subjectOverride: parent)
            .GetAsync(RouteChildGrades(child));

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        Assert.Contains(ModuleAccessCodes.ModuleDisabled, await response.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task Child_ExamResults_Show_Only_Published()
    {
        var (parent, child) = await CreateParentWithChildAsync(_seed.CenterA, "Exam Child");
        await SeedExamAttemptAsync(child, _seed.GroupA, published: true, score: 18, total: 20);
        await SeedExamAttemptAsync(child, _seed.GroupA, published: false, score: 9, total: 20);

        var response = await Client(AppRoles.Parent, isCenterAdmin: false, subjectOverride: parent)
            .GetAsync(RouteChildExams(child));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var exams = doc.RootElement.GetProperty("data").GetProperty("exams");

        Assert.Equal(1, exams.GetArrayLength());
        Assert.Equal(18m, exams[0].GetProperty("score").GetDecimal());
    }

    [Fact]
    public async Task Child_Sections_Never_Expose_Phone_Numbers()
    {
        var parentPhone = NewPhone();
        var parentId = await CreateUserAsync(_seed.CenterA, "Parent Leak", parentPhone, AppRoles.Parent);
        var child = await CreateStudentAsync(_seed.CenterA, "Data Child", parentPhone);
        await LinkAsync(parentId, child);

        SeedAttendance(_seed.CenterA, _seed.GroupA, child, AttendanceStatus.Present);
        SeedPayment(_seed.CenterA, _seed.GroupA, child, paid: 50, total: 100);

        var client = Client(AppRoles.Parent, isCenterAdmin: false, subjectOverride: parentId);

        var attendance = await client.GetAsync(RouteChildAttendance(child));
        var payments = await client.GetAsync(RouteChildPayments(child));

        Assert.Equal(HttpStatusCode.OK, attendance.StatusCode);
        Assert.Equal(HttpStatusCode.OK, payments.StatusCode);

        // The parent phone is stored on the student as ParentPhoneNumber; it must
        // never appear in any parent-portal payload.
        Assert.DoesNotContain(parentPhone, await attendance.Content.ReadAsStringAsync());
        Assert.DoesNotContain(parentPhone, await payments.Content.ReadAsStringAsync());
        Assert.False(attendance.Content.ReadAsStringAsync().Result.Contains("phone", StringComparison.OrdinalIgnoreCase));
        Assert.False(payments.Content.ReadAsStringAsync().Result.Contains("phone", StringComparison.OrdinalIgnoreCase));
    }

    // ---------------- helpers ----------------

    private static string NewPhone()
        => "012" + (Interlocked.Increment(ref _phoneSeed) % 100_000_000).ToString("D8");

    private static string RouteCreateParentAccount(Guid studentId)
        => Routing.StudentRouting.CreateParentAccount.Replace("{id}", studentId.ToString());

    private static string RouteBulkCreateParentAccounts()
        => Routing.StudentRouting.BulkCreateParentAccounts;

    private static StringContent BulkPayload(object payload)
        => new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");

    private async Task<Guid> CreateGroupAsync(Guid centerId, string name)
    {
        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var group = new Group
        {
            Id = Guid.NewGuid(),
            Name = name,
            CenterId = centerId,
            MonthlyPrice = 100,
            SessionsPerMonth = 8
        };

        context.Groups.Add(group);
        await context.SaveChangesAsync();

        return group.Id;
    }

    private async Task<Guid> CreateStudentInGroupAsync(
        Guid centerId,
        Guid groupId,
        string fullName,
        string parentPhone)
    {
        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var student = new Student
        {
            Id = Guid.NewGuid(),
            FullName = fullName,
            PhoneNumber = NewPhone(),
            ParentPhoneNumber = parentPhone,
            CenterId = centerId
        };

        context.Students.Add(student);

        context.StudentGroups.Add(new StudentGroup
        {
            StudentId = student.Id,
            GroupId = groupId,
            CenterId = centerId,
            IsActive = true,
            JoinDate = new DateTime(2026, 8, 1),
            LeftAt = null
        });

        await context.SaveChangesAsync();

        return student.Id;
    }

    private async Task<(Guid ParentUserId, Guid StudentId)> CreateParentWithChildAsync(Guid centerId, string childName)
    {
        var phone = NewPhone();
        var parentId = await CreateUserAsync(centerId, $"Parent of {childName}", phone, AppRoles.Parent);
        var studentId = await CreateStudentAsync(centerId, childName, phone);

        using (var scope = _factory.Services.CreateScope())
        {
            var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            context.ParentStudentLinks.Add(new ParentStudentLink
            {
                ParentUserId = parentId,
                StudentId = studentId,
                CenterId = centerId
            });
            await context.SaveChangesAsync();
        }

        return (parentId, studentId);
    }

    private async Task<Guid> CreateUserAsync(Guid centerId, string fullName, string phone, string role)
    {
        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<User>>();

        var user = new User
        {
            Id = Guid.NewGuid(),
            FullName = fullName,
            UserName = phone,
            PhoneNumber = phone,
            EmailConfirmed = true,
            CenterId = centerId
        };

        var result = await userManager.CreateAsync(user);
        Assert.True(result.Succeeded, string.Join("؛ ", result.Errors.Select(e => e.Description)));

        await userManager.AddToRoleAsync(user, role);

        return user.Id;
    }

    private async Task<Guid> CreateStudentAsync(
        Guid centerId,
        string fullName,
        string parentPhone,
        string? studentPhone = null)
    {
        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var student = new Student
        {
            Id = Guid.NewGuid(),
            FullName = fullName,
            PhoneNumber = studentPhone ?? NewPhone(),
            ParentPhoneNumber = parentPhone,
            CenterId = centerId
        };

        context.Students.Add(student);
        await context.SaveChangesAsync();

        return student.Id;
    }

    private async Task<User?> FindUserByPhoneAsync(string phone)
    {
        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        return await context.Users.IgnoreQueryFilters().FirstOrDefaultAsync(u => u.PhoneNumber == phone);
    }

    private async Task<bool> IsInRoleAsync(Guid userId, string role)
    {
        using var scope = _factory.Services.CreateScope();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<User>>();
        var user = await userManager.FindByIdAsync(userId.ToString());

        return user is not null && await userManager.IsInRoleAsync(user, role);
    }

    private async Task<int> CountLinksAsync(Guid parentUserId, Guid studentId)
    {
        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        return await context.ParentStudentLinks
            .IgnoreQueryFilters()
            .CountAsync(l => l.ParentUserId == parentUserId && l.StudentId == studentId);
    }

    private async Task<int> CountLinksForStudentAsync(Guid studentId)
    {
        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        return await context.ParentStudentLinks
            .IgnoreQueryFilters()
            .CountAsync(l => l.StudentId == studentId);
    }

    private async Task<int> CountLinksForParentAsync(Guid parentUserId)
    {
        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        return await context.ParentStudentLinks
            .IgnoreQueryFilters()
            .CountAsync(l => l.ParentUserId == parentUserId);
    }

    private async Task LinkAsync(Guid parentUserId, Guid studentId)
    {
        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        context.ParentStudentLinks.Add(new ParentStudentLink
        {
            ParentUserId = parentUserId,
            StudentId = studentId,
            CenterId = _seed.CenterA
        });

        await context.SaveChangesAsync();
    }

    private void SeedAttendance(Guid centerId, Guid groupId, Guid studentId, AttendanceStatus status)
    {
        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var session = new Session
        {
            Id = Guid.NewGuid(),
            GroupId = groupId,
            CenterId = centerId,
            SessionPrice = 0,
            DayOfWeek = DayOfWeek.Saturday,
            StartTime = new TimeOnly(10, 0),
            EndTime = new TimeOnly(12, 0)
        };
        context.Sessions.Add(session);

        context.Attendances.Add(new Attendance
        {
            StudentId = studentId,
            SessionId = session.Id,
            CenterId = centerId,
            AttendanceDate = new DateOnly(2026, 8, 1),
            Status = status
        });

        context.SaveChanges();
    }

    private void SeedPayment(Guid centerId, Guid groupId, Guid studentId, decimal paid, decimal total)
    {
        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var payment = new Payment
        {
            Id = Guid.NewGuid(),
            CenterId = centerId,
            GroupId = groupId,
            StudentId = studentId,
            PaymentDate = new DateTime(2026, 8, 15, 10, 0, 0),
            BillingPeriod = new DateOnly(2026, 8, 1)
        };

        payment.StudentAmounts.Add(new StudentAmount
        {
            Id = Guid.NewGuid(),
            CenterId = centerId,
            Amount = paid,
            TotalAmount = total,
            PaidAmount = paid,
            RemainingAmount = total - paid,
            Status = paid >= total ? PaymentStatus.FullyPaid : PaymentStatus.PartialPaid
        });

        context.Payments.Add(payment);
        context.SaveChanges();
    }

    private async Task SeedExamAttemptAsync(Guid studentId, Guid groupId, bool published, decimal score, decimal total)
    {
        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var year = context.AcademicYears.FirstOrDefault();
        if (year is null)
        {
            year = new AcademicYear { Id = Guid.NewGuid(), Name = "2026", Order = 1 };
            context.AcademicYears.Add(year);
            await context.SaveChangesAsync();
        }

        var examId = Guid.NewGuid();
        context.QuestionExams.Add(new QuestionExam
        {
            Id = examId,
            Name = published ? "Published Exam" : "Draft Exam",
            GroupId = groupId,
            AcademicYearId = year.Id,
            Mode = QuestionExamMode.Paper,
            ExamDate = new DateTime(2026, 8, 20),
            DurationMinutes = 60,
            IsResultsPublished = published,
            CenterId = _seed.CenterA
        });

        context.StudentExamAttempts.Add(new StudentExamAttempt
        {
            Id = Guid.NewGuid(),
            QuestionExamId = examId,
            StudentId = studentId,
            Status = StudentExamAttemptStatus.Submitted,
            Score = score,
            TotalMark = total,
            SubmittedAt = new DateTime(2026, 8, 20, 12, 0, 0),
            CenterId = _seed.CenterA
        });

        await context.SaveChangesAsync();
    }

    private static string RouteChildSummary(Guid studentId)
        => Routing.ParentPortalRouting.ChildSummary.Replace("{studentId}", studentId.ToString());

    private static string RouteChildAttendance(Guid studentId)
        => Routing.ParentPortalRouting.ChildAttendance.Replace("{studentId}", studentId.ToString());

    private static string RouteChildGrades(Guid studentId)
        => Routing.ParentPortalRouting.ChildGrades.Replace("{studentId}", studentId.ToString());

    private static string RouteChildExams(Guid studentId)
        => Routing.ParentPortalRouting.ChildExams.Replace("{studentId}", studentId.ToString());

    private static string RouteChildPayments(Guid studentId)
        => Routing.ParentPortalRouting.ChildPayments.Replace("{studentId}", studentId.ToString());

    private static IEnumerable<string> ChildSectionRoutes(Guid studentId)
    {
        yield return RouteChildSummary(studentId);
        yield return RouteChildAttendance(studentId);
        yield return RouteChildGrades(studentId);
        yield return RouteChildExams(studentId);
        yield return RouteChildPayments(studentId);
    }

    private void SetModule(Guid centerId, string moduleKey, bool enabled)
    {
        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var row = context.CenterModules
            .IgnoreQueryFilters()
            .FirstOrDefault(m => m.CenterId == centerId && m.ModuleKey == moduleKey);

        if (row is null)
        {
            row = new CenterManagement.Data.Entities.Subscriptions.CenterModule
            {
                CenterId = centerId,
                ModuleKey = moduleKey
            };
            context.CenterModules.Add(row);
        }

        row.IsEnabled = enabled;
        row.IsDeleted = false;
        context.SaveChanges();

        scope.ServiceProvider.GetRequiredService<ICenterModuleService>().Invalidate(centerId);
    }

    private HttpClient CenterAdmin()
        => Client(AppRoles.Teacher, isCenterAdmin: true);

    private HttpClient Client(string role, bool isCenterAdmin, Guid? centerOverride = null, Guid? subjectOverride = null)
    {
        var client = _factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            BaseAddress = new Uri("https://localhost"),
            AllowAutoRedirect = false
        });

        var subject = subjectOverride ?? (role == AppRoles.Teacher ? _seed.TeacherA : _seed.CenterOwnerA);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(
            "Bearer",
            CreateToken(subject, role, centerOverride ?? _seed.CenterA, isCenterAdmin));

        return client;
    }

    private static string CreateToken(Guid userId, string role, Guid centerId, bool isCenterAdmin)
    {
        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, userId.ToString()),
            new Claim("Id", userId.ToString()),
            new Claim(ClaimTypes.Role, role),
            new Claim(TenantClaimTypes.CenterId, centerId.ToString())
        };

        if (isCenterAdmin)
            claims.Add(new Claim(AppPolicies.IsCenterAdminClaim, AppPolicies.TrueValue));

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
}

using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Net.Http.Headers;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using CenterManagement.Data.AppMetaData;
using CenterManagement.Data.Entities.Abstractions;
using CenterManagement.Data.Entities.Groups;
using CenterManagement.Infrustructure.Data;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;

namespace CenterManagement.Tests;

/// <summary>
/// Proves the backend policies enforce the role matrix (not just the menu):
/// a center owner cannot reach operational endpoints, an assistant cannot reach
/// expenses and cannot edit/delete payments, and a teacher cannot reach finance.
/// A few positive checks make sure the tightening did not over-block.
/// </summary>
public sealed class RoleAccessEndpointTests : IClassFixture<ScopeApiFactory>
{
    private readonly ScopeApiFactory _factory;
    private readonly SeedResult _seed;

    public RoleAccessEndpointTests(ScopeApiFactory factory)
    {
        _factory = factory;
        _seed = _factory.EnsureSeeded();
    }

    [Fact]
    public async Task CenterOwner_Cannot_Access_Operational_Attendance()
    {
        var response = await Client(_seed.CenterOwnerA, AppRoles.CenterOwner)
            .GetAsync("Api/V1/Attendance/stats");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Assistant_Cannot_Access_Expenses()
    {
        var response = await Client(_seed.AssistantA, AppRoles.Assistant)
            .GetAsync("Api/V1/Expense/Paginated");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Assistant_Cannot_Edit_A_Payment()
    {
        var content = new StringContent("{}", Encoding.UTF8, "application/json");

        var response = await Client(_seed.AssistantA, AppRoles.Assistant)
            .PutAsync("Api/V1/Payments/Edit", content);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Assistant_Cannot_Delete_A_Payment()
    {
        var response = await Client(_seed.AssistantA, AppRoles.Assistant)
            .DeleteAsync($"Api/V1/PaymentsDelete/{Guid.NewGuid()}");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Assistant_Can_Read_Groups_For_Operational_Use()
    {
        var response = await Client(_seed.AssistantA, AppRoles.Assistant)
            .GetAsync("Api/V1/Group/Paginated?PageNumber=1&PageSize=10");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task Teacher_Cannot_Access_Finance()
    {
        var response = await Client(_seed.TeacherA, AppRoles.Teacher)
            .GetAsync("Api/V1/Payments/students-finance?PageNumber=1&PageSize=10");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Teacher_Can_Access_Income()
    {
        var response = await Client(_seed.TeacherA, AppRoles.Teacher)
            .GetAsync("Api/V1/Income/Paginated?PageNumber=1&PageSize=10");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task CenterOwner_Can_Access_Income()
    {
        var response = await Client(_seed.CenterOwnerA, AppRoles.CenterOwner)
            .GetAsync("Api/V1/Income/Paginated?PageNumber=1&PageSize=10");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    // ---------------------------------------------------------------
    // Groups: create/edit/delete is CenterAdmin only. A regular teacher
    // is blocked; a solo teacher (is_center_admin) keeps full control.
    // ---------------------------------------------------------------

    [Fact]
    public async Task RegularTeacher_Cannot_Create_Group()
    {
        var response = await Client(_seed.TeacherA, AppRoles.Teacher)
            .PostAsync(
                "Api/V1/Group/Create",
                Json(new { name = "Teacher Group", sessionsPerMonth = 8, monthlyPrice = 100 }));

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task RegularTeacher_Cannot_Edit_Group()
    {
        var response = await Client(_seed.TeacherA, AppRoles.Teacher)
            .PutAsync(
                "Api/V1/Group/Edit",
                Json(new
                {
                    id = _seed.GroupA,
                    name = "Group A",
                    monthlyPrice = 100,
                    sessionsPerMonth = 8
                }));

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task RegularTeacher_Cannot_Delete_Group()
    {
        var response = await Client(_seed.TeacherA, AppRoles.Teacher)
            .DeleteAsync($"Api/V1/Group/delete/{_seed.GroupA}");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task RegularTeacher_Sees_Only_His_Own_Groups()
    {
        var response = await Client(_seed.TeacherA, AppRoles.Teacher)
            .GetAsync("Api/V1/Group/Paginated?PageNumber=1&PageSize=10");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);

        var names = doc.RootElement.GetProperty("data")
            .EnumerateArray()
            .Select(x => x.GetProperty("name").GetString() ?? string.Empty)
            .ToList();

        Assert.Contains("Group A", names);
        Assert.DoesNotContain("Group B", names);
    }

    [Fact]
    public async Task Group_List_Returns_Schedule_And_PerSessionPrice_From_Sessions()
    {
        // Seed a group + its Session rows directly (the test host swaps the
        // DbContext without the tenant interceptor, so CenterId is set here).
        using (var dbScope = _factory.Services.CreateScope())
        {
            var ctx = dbScope.ServiceProvider.GetRequiredService<AppDbContext>();
            var probe = new Group
            {
                Id = Guid.NewGuid(),
                Name = "Schedule Probe Group",
                CenterId = _seed.CenterA,
                MonthlyPrice = 400,
                SessionsPerMonth = 8
            };
            ctx.Groups.Add(probe);
            ctx.Sessions.Add(new Session
            {
                Id = Guid.NewGuid(),
                GroupId = probe.Id,
                CenterId = _seed.CenterA,
                DayOfWeek = DayOfWeek.Sunday,
                StartTime = new TimeOnly(10, 0),
                EndTime = new TimeOnly(11, 0),
                SessionPrice = 45
            });
            ctx.SaveChanges();
        }

        var response = await Client(_seed.CenterOwnerA, AppRoles.CenterOwner)
            .GetAsync("Api/V1/Group/Paginated?PageNumber=1&PageSize=50");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);

        var group = doc.RootElement.GetProperty("data")
            .EnumerateArray()
            .First(x => x.GetProperty("name").GetString() == "Schedule Probe Group");

        Assert.Equal(45m, group.GetProperty("perSessionPrice").GetDecimal());

        var schedule = group.GetProperty("schedule").EnumerateArray().ToList();
        Assert.Single(schedule);
        // .NET DayOfWeek.Sunday = 0
        Assert.Equal(0, schedule[0].GetProperty("dayOfWeek").GetInt32());
        Assert.Equal("10:00", schedule[0].GetProperty("startTime").GetString());
        Assert.Equal("11:00", schedule[0].GetProperty("endTime").GetString());
    }

    [Fact]
    public async Task SoloTeacher_Can_Create_Group()
    {
        // Center Solo is a real solo-teacher center, so a group with no
        // teacherId links the center's single teacher automatically.
        var response = await Client(_seed.SoloTeacherB, AppRoles.Teacher, isCenterAdmin: true, centerId: _seed.CenterSolo)
            .PostAsync(
                "Api/V1/Group/Create",
                Json(new { name = "Solo New Group", sessionsPerMonth = 8, monthlyPrice = 100 }));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task SoloTeacher_Can_Edit_Group()
    {
        // Use a dedicated group so we never mutate the shared seeded Group A
        // (editing it without a teacherId would wipe Teacher A's link).
        var create = await Client(_seed.SoloTeacherB, AppRoles.Teacher, isCenterAdmin: true, centerId: _seed.CenterSolo)
            .PostAsync(
                "Api/V1/Group/Create",
                Json(new { name = "Solo Edit Target", sessionsPerMonth = 8, monthlyPrice = 100 }));
        Assert.Equal(HttpStatusCode.OK, create.StatusCode);

        var groupId = await GroupIdByNameAsync("Solo Edit Target");

        var response = await Client(_seed.SoloTeacherB, AppRoles.Teacher, isCenterAdmin: true, centerId: _seed.CenterSolo)
            .PutAsync(
                "Api/V1/Group/Edit",
                Json(new
                {
                    id = groupId,
                    name = "Solo Edit Target",
                    monthlyPrice = 120,
                    sessionsPerMonth = 8,
                    teacherId = _seed.SoloTeacherB
                }));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task SoloTeacher_Can_Delete_Group()
    {
        // Use a dedicated group so we never soft-delete the shared seeded Group B.
        var create = await Client(_seed.SoloTeacherB, AppRoles.Teacher, isCenterAdmin: true, centerId: _seed.CenterSolo)
            .PostAsync(
                "Api/V1/Group/Create",
                Json(new { name = "Solo Delete Target", sessionsPerMonth = 8, monthlyPrice = 100 }));
        Assert.Equal(HttpStatusCode.OK, create.StatusCode);

        var groupId = await GroupIdByNameAsync("Solo Delete Target");

        var response = await Client(_seed.SoloTeacherB, AppRoles.Teacher, isCenterAdmin: true, centerId: _seed.CenterSolo)
            .DeleteAsync($"Api/V1/Group/delete/{groupId}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    // ---------------------------------------------------------------
    // Payments: a teacher may create/view payments for his own groups
    // only; editing and deleting stay CenterAdmin.
    // ---------------------------------------------------------------

    [Fact]
    public async Task Teacher_Can_View_Payments()
    {
        var response = await Client(_seed.TeacherA, AppRoles.Teacher)
            .GetAsync("Api/V1/Payments/GetAll");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task Teacher_Cannot_Edit_Payment()
    {
        var response = await Client(_seed.TeacherA, AppRoles.Teacher)
            .PutAsync("Api/V1/Payments/Edit", Json(new { }));

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Teacher_Can_Create_Payment_For_Own_Student()
    {
        var response = await Client(_seed.TeacherA, AppRoles.Teacher)
            .PostAsync(
                "Api/V1/Payments/Create",
                Json(new
                {
                    studentId = _seed.StudentA,
                    groupId = _seed.GroupA,
                    billingPeriod = "2026-08-01",
                    amount = 50
                }));

        var body = await response.Content.ReadAsStringAsync();
        Assert.True(
            response.StatusCode == HttpStatusCode.OK,
            $"Expected OK but got {response.StatusCode}. Body: {body}");
    }

    [Fact]
    public async Task Teacher_Cannot_Create_Payment_For_Another_Teachers_Student()
    {
        var response = await Client(_seed.TeacherA, AppRoles.Teacher)
            .PostAsync(
                "Api/V1/Payments/Create",
                Json(new
                {
                    studentId = _seed.StudentB,
                    groupId = _seed.GroupB,
                    billingPeriod = "2026-08-01",
                    amount = 50
                }));

        var body = await response.Content.ReadAsStringAsync();
        using var document = JsonDocument.Parse(body);

        // The payment controller collapses failures to HTTP 400, but the
        // scope denial is reported as code 404 ("group not found").
        Assert.Equal(404, document.RootElement.GetProperty("statusCode").GetInt32());
    }

    // ---------------------------------------------------------------
    // Income: a regular teacher only sees income of his own groups.
    // ---------------------------------------------------------------

    [Fact]
    public async Task TeacherA_Does_Not_See_TeacherB_Income()
    {
        var names = await IncomeNames(_seed.TeacherA, AppRoles.Teacher);

        Assert.Contains("Income A", names);
        Assert.DoesNotContain("Income B", names);
    }

    [Fact]
    public async Task TeacherB_Does_Not_See_TeacherA_Income()
    {
        var names = await IncomeNames(_seed.TeacherB, AppRoles.Teacher);

        Assert.Contains("Income B", names);
        Assert.DoesNotContain("Income A", names);
    }

    private async Task<List<string>> IncomeNames(Guid userId, string role)
    {
        var response = await Client(userId, role)
            .GetAsync("Api/V1/Income/Paginated?PageNumber=1&PageSize=10");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var json = await response.Content.ReadAsStringAsync();
        using var document = JsonDocument.Parse(json);

        return document.RootElement
            .GetProperty("data")
            .GetProperty("data")
            .EnumerateArray()
            .Select(x => x.GetProperty("name").GetString() ?? string.Empty)
            .ToList();
    }

    private async Task<Guid> GroupIdByNameAsync(string name)
    {
        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        return await context.Groups
            .Where(g => g.Name == name)
            .Select(g => g.Id)
            .FirstAsync();
    }

    private static StringContent Json(object value) =>
        new(JsonSerializer.Serialize(value), Encoding.UTF8, "application/json");

    private HttpClient Client(Guid userId, string role, bool isCenterAdmin = false, Guid? centerId = null)
    {
        var client = _factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            BaseAddress = new Uri("https://localhost"),
            AllowAutoRedirect = false
        });

        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue(
                "Bearer",
                CreateToken(userId, role, centerId ?? _seed.CenterA, isCenterAdmin));

        return client;
    }

    private static string CreateToken(
        Guid userId,
        string role,
        Guid centerId,
        bool isCenterAdmin = false)
    {
        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, userId.ToString()),
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

    // ============================================================
    // Group & Payment integration tests
    // ============================================================

    [Fact]
    public async Task SoloTeacher_CreateGroup_CreatesSessionsInSingleTransaction()
    {
        var payload = new
        {
            name = "Test Group",
            monthlyPrice = 200,
            perSessionPrice = 25,
            sessionsPerMonth = 8,
            teacherId = _seed.SoloTeacherA,
            schedule = new[]
            {
                new { dayIndex = 0, startTime = "16:00", endTime = "17:30" }, // Saturday
                new { dayIndex = 2, startTime = "17:00", endTime = "18:30" }  // Monday
            }
        };

        var response = await Client(_seed.SoloTeacherA, AppRoles.Teacher, isCenterAdmin: true)
            .PostAsync("Api/V1/Group/Create", Json(payload));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        // Verify sessions were created
        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var groups = await context.Groups.Where(g => g.Name == "Test Group").ToListAsync();
        Assert.Single(groups);

        var group = groups[0];
        var sessions = await context.Sessions.Where(s => s.GroupId == group.Id).ToListAsync();
        Assert.Equal(2, sessions.Count);

        // Verify weekday mapping: dayIndex 0=Saturday, 2=Monday
        var dayOfWeeks = sessions.Select(s => s.DayOfWeek).ToHashSet();
        Assert.Contains(DayOfWeek.Saturday, dayOfWeeks);
        Assert.Contains(DayOfWeek.Monday, dayOfWeeks);

        // Verify session price
        Assert.All(sessions, s => Assert.Equal(25m, s.SessionPrice));

        // Verify TeacherGroup link
        var teacherGroups = await context.TeacherGroups.Where(tg => tg.GroupId == group.Id).ToListAsync();
        Assert.Single(teacherGroups);
        Assert.Equal(_seed.SoloTeacherA, teacherGroups[0].TeacherId);
    }

    [Fact]
    public async Task SoloTeacher_EditGroup_PreservesPastSessions()
    {
        // Create initial group with sessions
        var createPayload = new
        {
            name = "Edit Test Group",
            monthlyPrice = 300,
            perSessionPrice = 30,
            sessionsPerMonth = 8,
            teacherId = _seed.SoloTeacherA,
            schedule = new[]
            {
                new { dayIndex = 1, startTime = "10:00", endTime = "11:30" } // Sunday
            }
        };

        var createResponse = await Client(_seed.SoloTeacherA, AppRoles.Teacher, isCenterAdmin: true)
            .PostAsync("Api/V1/Group/Create", Json(createPayload));
        Assert.Equal(HttpStatusCode.OK, createResponse.StatusCode);

        // Wait a moment to ensure different CreatedAt
        await Task.Delay(100);

        // Find the created group by name
        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var group = await context.Groups.FirstAsync(g => g.Name == "Edit Test Group");
        var groupId = group.Id;

        // Edit group - change schedule to different days
        var editPayload = new
        {
            id = groupId,
            name = "Edit Test Group",
            monthlyPrice = 300,
            perSessionPrice = 35,
            sessionsPerMonth = 8,
            teacherId = _seed.SoloTeacherA,
            schedule = new[]
            {
                new { dayIndex = 3, startTime = "14:00", endTime = "15:30" }, // Tuesday
                new { dayIndex = 5, startTime = "16:00", endTime = "17:30" }  // Thursday
            }
        };

        var editResponse = await Client(_seed.SoloTeacherA, AppRoles.Teacher, isCenterAdmin: true)
            .PutAsync("Api/V1/Group/Edit", Json(editPayload));
        Assert.Equal(HttpStatusCode.OK, editResponse.StatusCode);

        // Verify past session preserved, new sessions added
        var sessions = await context.Sessions.Where(s => s.GroupId == groupId).ToListAsync();

        // Should have 3 sessions: 1 original (Sunday) + 2 new (Tuesday, Thursday)
        Assert.Equal(3, sessions.Count);

        var dayOfWeeks = sessions.Select(s => s.DayOfWeek).ToHashSet();
        Assert.Contains(DayOfWeek.Sunday, dayOfWeeks);    // Past session preserved
        Assert.Contains(DayOfWeek.Tuesday, dayOfWeeks);   // New session (dayIndex 3)
        Assert.Contains(DayOfWeek.Thursday, dayOfWeeks);  // New session (dayIndex 5)

        // Original session should have old price (30), new sessions new price (35)
        var originalSession = sessions.First(s => s.DayOfWeek == DayOfWeek.Sunday);
        Assert.Equal(30m, originalSession.SessionPrice);

        var newSessions = sessions.Where(s => s.DayOfWeek != DayOfWeek.Sunday).ToList();
        Assert.All(newSessions, s => Assert.Equal(35m, s.SessionPrice));
    }

    [Fact]
    public async Task SoloTeacher_CreatePayment_SetsReceivedByServerSide()
    {
        // First create a group
        var createPayload = new
        {
            name = "Payment Test Group",
            monthlyPrice = 400,
            perSessionPrice = 40,
            sessionsPerMonth = 8,
            teacherId = _seed.SoloTeacherA,
            schedule = new[]
            {
                new { dayIndex = 0, startTime = "09:00", endTime = "10:30" }
            }
        };

        var createResponse = await Client(_seed.SoloTeacherA, AppRoles.Teacher, isCenterAdmin: true)
            .PostAsync("Api/V1/Group/Create", Json(createPayload));
        Assert.Equal(HttpStatusCode.OK, createResponse.StatusCode);

        // Find the created group by name and enroll Student A so the monthly
        // payment validation (active membership) passes.
        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var group = await context.Groups.FirstAsync(g => g.Name == "Payment Test Group");
        var groupId = group.Id;

        context.StudentGroups.Add(new StudentGroup
        {
            StudentId = _seed.StudentA,
            GroupId = groupId,
            CenterId = _seed.CenterA,
            IsActive = true,
            JoinDate = new DateTime(2026, 8, 1)
        });
        await context.SaveChangesAsync();

        // Create payment for student in that group. A malicious client tries to
        // spoof the "received by" fields; the server must ignore them.
        var paymentPayload = new
        {
            studentId = _seed.StudentA,
            groupId = groupId,
            billingPeriod = "2026-08-01",
            amount = 100,
            receivedBy = _seed.TeacherA,
            receivedByName = "HACKED NAME"
        };

        var paymentResponse = await Client(_seed.SoloTeacherA, AppRoles.Teacher, isCenterAdmin: true)
            .PostAsync("Api/V1/Payments/Create", Json(paymentPayload));
        Assert.Equal(HttpStatusCode.OK, paymentResponse.StatusCode);

        // Verify ReceivedBy, ReceivedByName, ReceivedAt set server-side
        var payments = await context.Payments.Where(p => p.GroupId == groupId).ToListAsync();
        Assert.Single(payments);

        var payment = payments[0];
        Assert.Equal(_seed.SoloTeacherA, payment.ReceivedBy);
        Assert.Equal("Solo Teacher A", payment.ReceivedByName); // Full name, not GUID
        Assert.True(payment.ReceivedAt > DateTime.UtcNow.AddMinutes(-1)); // Recent UTC timestamp
        Assert.True(payment.ReceivedAt.Kind == DateTimeKind.Utc || payment.ReceivedAt.Kind == DateTimeKind.Unspecified);
    }
}

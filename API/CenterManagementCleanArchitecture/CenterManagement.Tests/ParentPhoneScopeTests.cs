using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Net.Http.Headers;
using System.Security.Claims;
using System.Text;
using CenterManagement.Data.AppMetaData;
using CenterManagement.Data.Entities.Abstractions;
using CenterManagement.Data.Entities.Exams;
using CenterManagement.Data.Entities.Groups;
using CenterManagement.Data.Enums;
using CenterManagement.Infrustructure.Data;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;

namespace CenterManagement.Tests;

/// <summary>
/// Proves the newly exposed <c>parentPhoneNumber</c> on the attendance sheet and
/// the exam grades page never leaks across teachers: the endpoints return the
/// parent phone for the caller's own scope only, and deny another teacher's
/// groups outright. Each test owns its SQLite-backed host so the seeded exams
/// are deterministic.
/// </summary>
public sealed class ParentPhoneScopeTests : IDisposable
{
    private const string AttendanceUrl = "Api/V1/Attendance/student-attendence";

    private readonly ScopeApiFactory _factory;
    private readonly SeedResult _seed;

    public ParentPhoneScopeTests()
    {
        _factory = new ScopeApiFactory();
        _seed = _factory.EnsureSeeded();
    }

    public void Dispose() => _factory.Dispose();

    // ============================================================
    // Exam grades page
    // ============================================================

    [Fact]
    public async Task Exam_Grades_Expose_Parent_Phone_For_Own_Group_Only()
    {
        var sessionA = SeedSession(_seed.CenterA, _seed.GroupA);
        var examA = SeedGradedExam(_seed.CenterA, _seed.GroupA, sessionA, _seed.StudentA);

        var sessionB = SeedSession(_seed.CenterA, _seed.GroupB);
        var examB = SeedGradedExam(_seed.CenterA, _seed.GroupB, sessionB, _seed.StudentB);

        // Teacher A only gets his own group's students, bytes for Student A.
        var own = await Teacher(AppRoles.Teacher, _seed.TeacherA)
            .GetAsync(ExamGradesUrl(_seed.GroupA, sessionA, examA));

        Assert.Equal(HttpStatusCode.OK, own.StatusCode);
        var ownPayload = await own.Content.ReadAsStringAsync();
        Assert.Contains(_seed.StudentA.ToString(), ownPayload);
        Assert.Contains("01200000011", ownPayload); // Student A parent phone
        Assert.DoesNotContain("01200000012", ownPayload); // Student B parent phone
        Assert.DoesNotContain(_seed.StudentB.ToString(), ownPayload);

        // Teacher A cannot reach Teacher B's group at all.
        var other = await Teacher(AppRoles.Teacher, _seed.TeacherA)
            .GetAsync(ExamGradesUrl(_seed.GroupB, sessionB, examB));

        Assert.Equal(HttpStatusCode.NotFound, other.StatusCode);
        var otherPayload = await other.Content.ReadAsStringAsync();
        Assert.DoesNotContain("01200000012", otherPayload);
        Assert.DoesNotContain(_seed.StudentB.ToString(), otherPayload);
    }

    [Fact]
    public async Task Exam_Grades_Assistant_Sees_Only_Linked_Teachers_Group()
    {
        var sessionA = SeedSession(_seed.CenterA, _seed.GroupA);
        var examA = SeedGradedExam(_seed.CenterA, _seed.GroupA, sessionA, _seed.StudentA);

        var sessionB = SeedSession(_seed.CenterA, _seed.GroupB);
        var examB = SeedGradedExam(_seed.CenterA, _seed.GroupB, sessionB, _seed.StudentB);

        // Assistant A is linked (by the factory) to Teacher A.
        var own = await Teacher(AppRoles.Assistant, _seed.AssistantA)
            .GetAsync(ExamGradesUrl(_seed.GroupA, sessionA, examA));
        Assert.Equal(HttpStatusCode.OK, own.StatusCode);
        Assert.Contains("01200000011", await own.Content.ReadAsStringAsync());

        var other = await Teacher(AppRoles.Assistant, _seed.AssistantA)
            .GetAsync(ExamGradesUrl(_seed.GroupB, sessionB, examB));
        Assert.Equal(HttpStatusCode.NotFound, other.StatusCode);
        Assert.DoesNotContain("01200000012", await other.Content.ReadAsStringAsync());
    }

    // ============================================================
    // Attendance sheet
    // ============================================================

    [Fact]
    public async Task Attendance_Exposes_Parent_Phone_For_Own_Group_Only()
    {
        var own = await Teacher(AppRoles.Teacher, _seed.TeacherA)
            .GetAsync($"{AttendanceUrl}?GroupId={_seed.GroupA}&PageIndex=1&PageSize=50");

        Assert.Equal(HttpStatusCode.OK, own.StatusCode);
        var ownPayload = await own.Content.ReadAsStringAsync();
        Assert.Contains(_seed.StudentA.ToString(), ownPayload);
        Assert.Contains("01200000011", ownPayload); // Student A parent phone

        var other = await Teacher(AppRoles.Teacher, _seed.TeacherA)
            .GetAsync($"{AttendanceUrl}?GroupId={_seed.GroupB}&PageIndex=1&PageSize=50");

        Assert.Equal(HttpStatusCode.NotFound, other.StatusCode);
        var otherPayload = await other.Content.ReadAsStringAsync();
        Assert.DoesNotContain("01200000012", otherPayload);
        Assert.DoesNotContain(_seed.StudentB.ToString(), otherPayload);
    }

    [Fact]
    public async Task Attendance_Assistant_Sees_Only_Linked_Teachers_Group()
    {
        var own = await Teacher(AppRoles.Assistant, _seed.AssistantA)
            .GetAsync($"{AttendanceUrl}?GroupId={_seed.GroupA}&PageIndex=1&PageSize=50");
        Assert.Equal(HttpStatusCode.OK, own.StatusCode);
        Assert.Contains("01200000011", await own.Content.ReadAsStringAsync());

        var other = await Teacher(AppRoles.Assistant, _seed.AssistantA)
            .GetAsync($"{AttendanceUrl}?GroupId={_seed.GroupB}&PageIndex=1&PageSize=50");
        Assert.Equal(HttpStatusCode.NotFound, other.StatusCode);
        Assert.DoesNotContain("01200000012", await other.Content.ReadAsStringAsync());
    }

    // ============================================================
    // Helpers
    // ============================================================

    private static string ExamGradesUrl(Guid groupId, Guid sessionId, Guid examId) =>
        $"Api/V1/Exam/groups/{groupId}/sessions/{sessionId}/exams/{examId}/grades";

    private HttpClient Teacher(string role, Guid userId) =>
        Client(userId, role, _seed.CenterA);

    private HttpClient Client(Guid userId, string role, Guid centerId)
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
        var claims = new List<Claim>
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
            expires: DateTime.UtcNow.AddHours(1),
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private Guid SeedSession(Guid centerId, Guid groupId)
    {
        using var scope = _factory.Services.CreateScope();
        var ctx = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var session = new Session
        {
            Id = Guid.NewGuid(),
            GroupId = groupId,
            CenterId = centerId,
            SessionPrice = 0,
            DayOfWeek = DayOfWeek.Monday,
            StartTime = new TimeOnly(10, 0),
            EndTime = new TimeOnly(12, 0)
        };

        ctx.Sessions.Add(session);
        ctx.SaveChanges();
        return session.Id;
    }

    private Guid SeedGradedExam(Guid centerId, Guid groupId, Guid sessionId, Guid studentId)
    {
        using var scope = _factory.Services.CreateScope();
        var ctx = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var exam = new Exam
        {
            Id = Guid.NewGuid(),
            Name = "Scope exam",
            GroupId = groupId,
            SessionId = sessionId,
            CenterId = centerId,
            ExamDate = new DateTime(2026, 8, 20)
        };
        ctx.Exams.Add(exam);

        var component = new ExamComponent
        {
            Id = Guid.NewGuid(),
            ExamId = exam.Id,
            Type = ExamType.Paragraph,
            TotalMarks = 10,
            CenterId = centerId
        };
        ctx.ExamComponents.Add(component);

        ctx.StudentExamComponents.Add(new StudentExamComponent
        {
            Id = Guid.NewGuid(),
            StudentId = studentId,
            ExamComponentId = component.Id,
            Mark = 5,
            CenterId = centerId
        });

        ctx.SaveChanges();
        return exam.Id;
    }
}

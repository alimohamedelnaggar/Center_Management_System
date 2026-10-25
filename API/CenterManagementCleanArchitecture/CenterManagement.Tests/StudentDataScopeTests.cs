using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Net.Http.Headers;
using System.Security.Claims;
using System.Text;
using CenterManagement.Data.AppMetaData;
using CenterManagement.Data.Entities.Abstractions;
using CenterManagement.Data.Entities.Exams;
using CenterManagement.Data.Entities.Groups;
using CenterManagement.Data.Entities.Notes;
using CenterManagement.Data.Entities.QuestionBank;
using CenterManagement.Data.Enums;
using CenterManagement.Infrustructure.Data;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;

namespace CenterManagement.Tests;

/// <summary>
/// Security-audit regression tests. Every endpoint listed here returns student
/// or student-linked data (group exams, exam stats, question-exam papers,
/// results, attempts, study notes). Each one must honour the teacher/assistant
/// group scope: the caller only reaches his own groups, and another teacher's
/// group is denied with 404. A center-wide operator (solo teacher with the
/// <c>is_center_admin</c> claim) still sees every group of his center.
///
/// Each test owns its SQLite-backed host so the seeded rows are deterministic.
/// </summary>
public sealed class StudentDataScopeTests : IDisposable
{
    private readonly ScopeApiFactory _factory;
    private readonly SeedResult _seed;

    public StudentDataScopeTests()
    {
        _factory = new ScopeApiFactory();
        _seed = _factory.EnsureSeeded();
    }

    public void Dispose() => _factory.Dispose();

    // ============================================================
    // ExamController.GroupSessionExams  (Api/V1/Exam/groups/..)
    // ============================================================

    [Fact]
    public async Task Group_Session_Exams_Are_Scoped_To_Own_Group()
    {
        var sessionA = SeedSession(_seed.GroupA);
        var sessionB = SeedSession(_seed.GroupB);
        var examA = SeedExam(_seed.GroupA, sessionA, "Exam A");
        var examB = SeedExam(_seed.GroupB, sessionB, "Exam B");

        var own = await Teacher(AppRoles.Teacher, _seed.TeacherA)
            .GetAsync($"Api/V1/Exam/groups/{_seed.GroupA}/sessions/{sessionA}/exams");

        Assert.Equal(HttpStatusCode.OK, own.StatusCode);
        var ownPayload = await own.Content.ReadAsStringAsync();
        Assert.Contains(examA.ToString(), ownPayload);
        Assert.DoesNotContain(examB.ToString(), ownPayload);

        var other = await Teacher(AppRoles.Teacher, _seed.TeacherA)
            .GetAsync($"Api/V1/Exam/groups/{_seed.GroupB}/sessions/{sessionB}/exams");

        Assert.Equal(HttpStatusCode.NotFound, other.StatusCode);
        Assert.DoesNotContain(examB.ToString(), await other.Content.ReadAsStringAsync());
    }

    // ============================================================
    // ExamController.GetStats  (Api/V1/ExamRoles/stats)
    // ============================================================

    [Fact]
    public async Task Exam_Stats_Are_Scoped_To_Own_Group()
    {
        var sessionA = SeedSession(_seed.GroupA);
        var examA = SeedExam(_seed.GroupA, sessionA, "Exam A");
        var sessionB = SeedSession(_seed.GroupB);
        var examB = SeedExam(_seed.GroupB, sessionB, "Exam B");

        var own = await Teacher(AppRoles.Teacher, _seed.TeacherA)
            .GetAsync($"Api/V1/ExamRoles/stats?GroupId={_seed.GroupA}&SessionId={sessionA}&ExamId={examA}");
        Assert.Equal(HttpStatusCode.OK, own.StatusCode);

        var other = await Teacher(AppRoles.Teacher, _seed.TeacherA)
            .GetAsync($"Api/V1/ExamRoles/stats?GroupId={_seed.GroupB}&SessionId={sessionB}&ExamId={examB}");
        Assert.Equal(HttpStatusCode.NotFound, other.StatusCode);
    }

    // ============================================================
    // QuestionExam paginated  (Api/V1/QuestionExam/Paginated)
    // ============================================================

    [Fact]
    public async Task Question_Exam_List_Is_Scoped_To_Own_Group()
    {
        var examA = SeedQuestionExam(_seed.GroupA, "Paper A");
        var examB = SeedQuestionExam(_seed.GroupB, "Paper B");

        // No GroupId filter: a restricted teacher only sees his own group's exams.
        var list = await Teacher(AppRoles.Teacher, _seed.TeacherA)
            .GetAsync("Api/V1/QuestionExam/Paginated?PageNumber=1&PageSize=50");
        Assert.Equal(HttpStatusCode.OK, list.StatusCode);
        var listPayload = await list.Content.ReadAsStringAsync();
        Assert.Contains(examA.ToString(), listPayload);
        Assert.DoesNotContain(examB.ToString(), listPayload);

        // Explicitly asking for another teacher's group is denied.
        var other = await Teacher(AppRoles.Teacher, _seed.TeacherA)
            .GetAsync($"Api/V1/QuestionExam/Paginated?PageNumber=1&PageSize=50&GroupId={_seed.GroupB}");
        Assert.Equal(HttpStatusCode.NotFound, other.StatusCode);
        Assert.DoesNotContain(examB.ToString(), await other.Content.ReadAsStringAsync());

        var own = await Teacher(AppRoles.Teacher, _seed.TeacherA)
            .GetAsync($"Api/V1/QuestionExam/Paginated?PageNumber=1&PageSize=50&GroupId={_seed.GroupA}");
        Assert.Equal(HttpStatusCode.OK, own.StatusCode);
        Assert.Contains(examA.ToString(), await own.Content.ReadAsStringAsync());
    }

    // ============================================================
    // QuestionExam by id  (Api/V1/QuestionExam/{id})
    // ============================================================

    [Fact]
    public async Task Question_Exam_Detail_Denies_Other_Teachers_Group()
    {
        var examA = SeedQuestionExam(_seed.GroupA, "Paper A");
        var examB = SeedQuestionExam(_seed.GroupB, "Paper B");

        var own = await Teacher(AppRoles.Teacher, _seed.TeacherA)
            .GetAsync($"Api/V1/QuestionExam/{examA}");
        Assert.Equal(HttpStatusCode.OK, own.StatusCode);
        Assert.Contains(examA.ToString(), await own.Content.ReadAsStringAsync());

        var other = await Teacher(AppRoles.Teacher, _seed.TeacherA)
            .GetAsync($"Api/V1/QuestionExam/{examB}");
        Assert.Equal(HttpStatusCode.NotFound, other.StatusCode);
        Assert.DoesNotContain(examB.ToString(), await other.Content.ReadAsStringAsync());
    }

    // ============================================================
    // QuestionExam results  (Api/V1/QuestionExam/{id}/Results)
    // ============================================================

    [Fact]
    public async Task Question_Exam_Results_Do_Not_Leak_Other_Teachers_Students()
    {
        var examA = SeedQuestionExam(_seed.GroupA, "Paper A");
        var examB = SeedQuestionExam(_seed.GroupB, "Paper B");

        var own = await Teacher(AppRoles.Teacher, _seed.TeacherA)
            .GetAsync($"Api/V1/QuestionExam/{examA}/Results");
        Assert.Equal(HttpStatusCode.OK, own.StatusCode);
        Assert.Contains(_seed.StudentA.ToString(), await own.Content.ReadAsStringAsync());

        var other = await Teacher(AppRoles.Teacher, _seed.TeacherA)
            .GetAsync($"Api/V1/QuestionExam/{examB}/Results");
        Assert.Equal(HttpStatusCode.NotFound, other.StatusCode);
        var otherPayload = await other.Content.ReadAsStringAsync();
        Assert.DoesNotContain(_seed.StudentB.ToString(), otherPayload);
        Assert.DoesNotContain("Student B", otherPayload);
    }

    // ============================================================
    // QuestionExam attempt detail  (Api/V1/QuestionExam/Attempts/{id})
    // ============================================================

    [Fact]
    public async Task Question_Exam_Attempt_Denies_Other_Teachers_Student()
    {
        var examA = SeedQuestionExam(_seed.GroupA, "Paper A");
        var examB = SeedQuestionExam(_seed.GroupB, "Paper B");
        var attemptA = SeedAttempt(examA, _seed.StudentA);
        var attemptB = SeedAttempt(examB, _seed.StudentB);

        var own = await Teacher(AppRoles.Teacher, _seed.TeacherA)
            .GetAsync($"Api/V1/QuestionExam/Attempts/{attemptA}");
        Assert.Equal(HttpStatusCode.OK, own.StatusCode);
        Assert.Contains(_seed.StudentA.ToString(), await own.Content.ReadAsStringAsync());

        var other = await Teacher(AppRoles.Teacher, _seed.TeacherA)
            .GetAsync($"Api/V1/QuestionExam/Attempts/{attemptB}");
        Assert.Equal(HttpStatusCode.NotFound, other.StatusCode);
        Assert.DoesNotContain(_seed.StudentB.ToString(), await other.Content.ReadAsStringAsync());
    }

    // ============================================================
    // StudyNote paginated  (Api/V1/StudyNote/Paginated)
    // ============================================================

    [Fact]
    public async Task Study_Notes_Are_Scoped_To_Own_Group()
    {
        var noteA = SeedStudyNote(_seed.GroupA, "Note A");
        var noteB = SeedStudyNote(_seed.GroupB, "Note B");

        var list = await Teacher(AppRoles.Teacher, _seed.TeacherA)
            .GetAsync("Api/V1/StudyNote/Paginated?PageNumber=1&PageSize=50");
        Assert.Equal(HttpStatusCode.OK, list.StatusCode);
        var listPayload = await list.Content.ReadAsStringAsync();
        Assert.Contains(noteA.ToString(), listPayload);
        Assert.DoesNotContain(noteB.ToString(), listPayload);

        var other = await Teacher(AppRoles.Teacher, _seed.TeacherA)
            .GetAsync($"Api/V1/StudyNote/Paginated?PageNumber=1&PageSize=50&GroupId={_seed.GroupB}");
        Assert.Equal(HttpStatusCode.NotFound, other.StatusCode);
        Assert.DoesNotContain(noteB.ToString(), await other.Content.ReadAsStringAsync());

        var own = await Teacher(AppRoles.Teacher, _seed.TeacherA)
            .GetAsync($"Api/V1/StudyNote/Paginated?PageNumber=1&PageSize=50&GroupId={_seed.GroupA}");
        Assert.Equal(HttpStatusCode.OK, own.StatusCode);
        Assert.Contains(noteA.ToString(), await own.Content.ReadAsStringAsync());
    }

    // ============================================================
    // Center-wide operator still sees every group
    // ============================================================

    [Fact]
    public async Task Center_Wide_Teacher_Sees_Every_Group()
    {
        var examA = SeedQuestionExam(_seed.GroupA, "Paper A");
        var examB = SeedQuestionExam(_seed.GroupB, "Paper B");

        // A solo teacher carries the is_center_admin claim, so his scope is the
        // whole center and both groups appear.
        var payload = await CenterWideTeacher(_seed.TeacherA)
            .GetStringAsync("Api/V1/QuestionExam/Paginated?PageNumber=1&PageSize=50");

        Assert.Contains(examA.ToString(), payload);
        Assert.Contains(examB.ToString(), payload);
    }

    // ============================================================
    // Helpers
    // ============================================================

    private HttpClient Teacher(string role, Guid userId) => Client(userId, role, _seed.CenterA);

    private HttpClient CenterWideTeacher(Guid userId) =>
        Client(userId, AppRoles.Teacher, _seed.CenterA, centerAdmin: true);

    private HttpClient Client(Guid userId, string role, Guid centerId, bool centerAdmin = false)
    {
        var client = _factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            BaseAddress = new Uri("https://localhost"),
            AllowAutoRedirect = false
        });

        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", CreateToken(userId, role, centerId, centerAdmin));

        return client;
    }

    private static string CreateToken(Guid userId, string role, Guid centerId, bool centerAdmin)
    {
        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, userId.ToString()),
            new Claim(ClaimTypes.Role, role),
            new Claim(TenantClaimTypes.CenterId, centerId.ToString())
        };

        if (centerAdmin)
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

    private void Write(Action<AppDbContext> action)
    {
        using var scope = _factory.Services.CreateScope();
        var ctx = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        action(ctx);
        ctx.SaveChanges();
    }

    private Guid SeedSession(Guid groupId)
    {
        var id = Guid.NewGuid();
        Write(ctx => ctx.Sessions.Add(new Session
        {
            Id = id,
            GroupId = groupId,
            CenterId = _seed.CenterA,
            SessionPrice = 0,
            DayOfWeek = DayOfWeek.Monday,
            StartTime = new TimeOnly(10, 0),
            EndTime = new TimeOnly(12, 0)
        }));
        return id;
    }

    private Guid SeedExam(Guid groupId, Guid sessionId, string name)
    {
        var id = Guid.NewGuid();
        Write(ctx => ctx.Exams.Add(new Exam
        {
            Id = id,
            Name = name,
            GroupId = groupId,
            SessionId = sessionId,
            CenterId = _seed.CenterA,
            ExamDate = new DateTime(2026, 8, 20)
        }));
        return id;
    }

    private Guid SeedQuestionExam(Guid groupId, string name)
    {
        var id = Guid.NewGuid();
        Write(ctx =>
        {
            var academicYear = ctx.AcademicYears.FirstOrDefault();
            if (academicYear is null)
            {
                academicYear = new AcademicYear { Id = Guid.NewGuid(), Name = "2026", Order = 1 };
                ctx.AcademicYears.Add(academicYear);
            }

            ctx.QuestionExams.Add(new QuestionExam
            {
                Id = id,
                Name = name,
                GroupId = groupId,
                AcademicYearId = academicYear.Id,
                Mode = QuestionExamMode.Paper,
                ExamDate = new DateTime(2026, 8, 20),
                DurationMinutes = 60,
                CenterId = _seed.CenterA
            });
        });
        return id;
    }

    private Guid SeedAttempt(Guid questionExamId, Guid studentId)
    {
        var id = Guid.NewGuid();
        Write(ctx => ctx.StudentExamAttempts.Add(new StudentExamAttempt
        {
            Id = id,
            QuestionExamId = questionExamId,
            StudentId = studentId,
            Status = StudentExamAttemptStatus.InProgress,
            Score = 0,
            TotalMark = 0,
            CenterId = _seed.CenterA
        }));
        return id;
    }

    private Guid SeedStudyNote(Guid groupId, string title)
    {
        var id = Guid.NewGuid();
        Write(ctx =>
        {
            ctx.StudyNotes.Add(new StudyNote
            {
                Id = id,
                Title = title,
                FileName = $"{Guid.NewGuid():N}.pdf",
                OriginalFileName = $"{title}.pdf",
                FileSize = 1024,
                CenterId = _seed.CenterA
            });

            ctx.StudyNoteGroups.Add(new StudyNoteGroup
            {
                StudyNoteId = id,
                GroupId = groupId,
                CenterId = _seed.CenterA
            });
        });
        return id;
    }
}

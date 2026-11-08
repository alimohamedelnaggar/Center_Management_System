using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Net.Http.Headers;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using CenterManagement.Data.AppMetaData;
using CenterManagement.Data.Entities.Abstractions;
using CenterManagement.Data.Entities.Groups;
using CenterManagement.Data.Entities.Users;
using CenterManagement.Data.Enums;
using CenterManagement.Infrustructure.Data;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;

namespace CenterManagement.Tests;

/// <summary>
/// Shared setup for the attendance statistics scenarios. Each concrete class
/// gets its own <see cref="ScopeApiFactory"/> (and therefore its own database),
/// so "all absent" / "all excused" can be asserted without cross-test noise.
/// </summary>
public abstract class AttendanceStatsTestBase
{
    private static long _phoneSeed = DateTime.UtcNow.Ticks;

    protected AttendanceStatsTestBase(ScopeApiFactory factory)
    {
        Factory = factory;
        SeedResult = factory.EnsureSeeded();
    }

    protected ScopeApiFactory Factory { get; }

    protected SeedResult SeedResult { get; }

    protected static DateOnly Today => DateOnly.FromDateTime(DateTime.Now);

    protected static string NewPhone()
        => "012" + (Interlocked.Increment(ref _phoneSeed) % 100_000_000).ToString("D8");

    protected async Task<Guid> CreateStudentAsync(Guid groupId)
    {
        using var scope = Factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var student = new Student
        {
            Id = Guid.NewGuid(),
            FullName = "Stats Student",
            PhoneNumber = NewPhone(),
            ParentPhoneNumber = NewPhone(),
            CenterId = SeedResult.CenterA,
            SubscriptionType = SubscriptionType.Session
        };

        context.Students.Add(student);
        context.StudentGroups.Add(new StudentGroup
        {
            StudentId = student.Id,
            GroupId = groupId,
            CenterId = SeedResult.CenterA,
            IsActive = true,
            JoinDate = new DateTime(2026, 8, 1)
        });

        await context.SaveChangesAsync();

        return student.Id;
    }

    protected async Task<Guid> SeedSessionAsync(Guid groupId)
    {
        using var scope = Factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var session = new Session
        {
            Id = Guid.NewGuid(),
            GroupId = groupId,
            CenterId = SeedResult.CenterA,
            SessionPrice = 0,
            DayOfWeek = DayOfWeek.Saturday,
            StartTime = new TimeOnly(10, 0),
            EndTime = new TimeOnly(12, 0)
        };

        context.Sessions.Add(session);
        await context.SaveChangesAsync();

        return session.Id;
    }

    protected static async Task<HttpResponseMessage> SaveAttendanceAsync(
        HttpClient client,
        Guid sessionId,
        DateOnly date,
        params (Guid StudentId, AttendanceStatus Status)[] items)
    {
        var payload = JsonSerializer.Serialize(new
        {
            sessionId,
            attendanceDate = date.ToString("yyyy-MM-dd"),
            attendances = items.Select(i => new
            {
                studentId = i.StudentId,
                status = (int)i.Status
            })
        });

        return await client.PostAsync(
            Routing.AttendanceRouting.Create,
            new StringContent(payload, Encoding.UTF8, "application/json"));
    }

    protected static async Task<AttendanceStatsSnapshot> GetStatsAsync(HttpClient client)
    {
        var response = await client.GetAsync(Routing.AttendanceRouting.Stats);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var data = doc.RootElement.GetProperty("data");

        return new AttendanceStatsSnapshot(
            data.GetProperty("presentToday").GetInt32(),
            data.GetProperty("absentToday").GetInt32(),
            data.GetProperty("lateToday").GetInt32(),
            data.GetProperty("excusedToday").GetInt32(),
            data.GetProperty("totalToday").GetInt32(),
            data.GetProperty("presentThisMonth").GetInt32(),
            data.GetProperty("absentThisMonth").GetInt32(),
            data.GetProperty("lateThisMonth").GetInt32(),
            data.GetProperty("excusedThisMonth").GetInt32(),
            data.GetProperty("totalThisMonth").GetInt32(),
            data.GetProperty("attendanceRate").ValueKind == JsonValueKind.Null
                ? null
                : data.GetProperty("attendanceRate").GetDouble());
    }

    protected HttpClient CenterAdmin()
        => Client(AppRoles.Teacher, isCenterAdmin: true, SeedResult.CenterA, SeedResult.TeacherA);

    protected HttpClient Client(string role, bool isCenterAdmin, Guid centerId, Guid subject)
    {
        var client = Factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            BaseAddress = new Uri("https://localhost"),
            AllowAutoRedirect = false
        });

        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(
            "Bearer",
            CreateToken(subject, role, centerId, isCenterAdmin));

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

    protected sealed record AttendanceStatsSnapshot(
        int PresentToday,
        int AbsentToday,
        int LateToday,
        int ExcusedToday,
        int TotalToday,
        int PresentThisMonth,
        int AbsentThisMonth,
        int LateThisMonth,
        int ExcusedThisMonth,
        int TotalThisMonth,
        double? AttendanceRate);
}

public sealed class AttendanceStatsTests : AttendanceStatsTestBase, IClassFixture<ScopeApiFactory>
{
    public AttendanceStatsTests(ScopeApiFactory factory) : base(factory)
    {
    }

    [Fact]
    public async Task Four_States_Are_Counted_And_The_Rate_Uses_The_Unified_Formula()
    {
        var sessionId = await SeedSessionAsync(SeedResult.GroupA);

        var present = await CreateStudentAsync(SeedResult.GroupA);
        var absent = await CreateStudentAsync(SeedResult.GroupA);
        var late = await CreateStudentAsync(SeedResult.GroupA);
        var excused = await CreateStudentAsync(SeedResult.GroupA);

        var client = CenterAdmin();
        var before = await GetStatsAsync(client);

        var saved = await SaveAttendanceAsync(client, sessionId, Today,
            (present, AttendanceStatus.Present),
            (absent, AttendanceStatus.Absent),
            (late, AttendanceStatus.Late),
            (excused, AttendanceStatus.Excused));
        Assert.Equal(HttpStatusCode.OK, saved.StatusCode);

        var after = await GetStatsAsync(client);

        Assert.Equal(before.PresentToday + 1, after.PresentToday);
        Assert.Equal(before.AbsentToday + 1, after.AbsentToday);
        Assert.Equal(before.LateToday + 1, after.LateToday);
        Assert.Equal(before.ExcusedToday + 1, after.ExcusedToday);
        Assert.Equal(before.TotalToday + 4, after.TotalToday);

        Assert.Equal(before.PresentThisMonth + 1, after.PresentThisMonth);
        Assert.Equal(before.AbsentThisMonth + 1, after.AbsentThisMonth);
        Assert.Equal(before.LateThisMonth + 1, after.LateThisMonth);
        Assert.Equal(before.ExcusedThisMonth + 1, after.ExcusedThisMonth);
        Assert.Equal(before.TotalThisMonth + 4, after.TotalThisMonth);

        var countable = after.TotalToday - after.ExcusedToday;
        var expected = countable <= 0
            ? (double?)null
            : Math.Round((after.PresentToday + after.LateToday) * 100.0 / countable, 2);

        Assert.Equal(expected, after.AttendanceRate);
    }

    [Fact]
    public async Task Legacy_Manual_Rows_Keep_Counting_Without_A_Data_Migration()
    {
        var sessionId = await SeedSessionAsync(SeedResult.GroupA);
        var present = await CreateStudentAsync(SeedResult.GroupA);
        var absent = await CreateStudentAsync(SeedResult.GroupA);

        // Rows written the way the pre-feature code wrote them: numeric status
        // 1/2, manual source, no recorded-at metadata.
        using (var scope = Factory.Services.CreateScope())
        {
            var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            context.Attendances.AddRange(
                new Attendance
                {
                    StudentId = present,
                    SessionId = sessionId,
                    AttendanceDate = Today,
                    Status = AttendanceStatus.Present,
                    Source = AttendanceSource.Manual,
                    CenterId = SeedResult.CenterA
                },
                new Attendance
                {
                    StudentId = absent,
                    SessionId = sessionId,
                    AttendanceDate = Today,
                    Status = AttendanceStatus.Absent,
                    Source = AttendanceSource.Manual,
                    CenterId = SeedResult.CenterA
                });

            await context.SaveChangesAsync();
        }

        var client = CenterAdmin();
        var stats = await GetStatsAsync(client);

        Assert.True(stats.PresentToday >= 2);
        Assert.True(stats.AbsentToday >= 1);
        Assert.NotNull(stats.AttendanceRate);
    }

    [Fact]
    public async Task Another_Centers_Stats_Stay_Empty()
    {
        var sessionId = await SeedSessionAsync(SeedResult.GroupA);
        var student = await CreateStudentAsync(SeedResult.GroupA);

        var saved = await SaveAttendanceAsync(CenterAdmin(), sessionId, Today,
            (student, AttendanceStatus.Present));
        Assert.Equal(HttpStatusCode.OK, saved.StatusCode);

        var otherCenter = Client(
            AppRoles.Assistant,
            isCenterAdmin: false,
            SeedResult.CenterB,
            SeedResult.AssistantB);

        var stats = await GetStatsAsync(otherCenter);

        Assert.Equal(0, stats.TotalToday);
        Assert.Equal(0, stats.TotalThisMonth);
        Assert.Null(stats.AttendanceRate);
    }
}

/// <summary>A day with only absences is 0%, not "no rate".</summary>
public sealed class AttendanceRateAllAbsentTests : AttendanceStatsTestBase, IClassFixture<ScopeApiFactory>
{
    public AttendanceRateAllAbsentTests(ScopeApiFactory factory) : base(factory)
    {
    }

    [Fact]
    public async Task All_Absent_Is_Zero_Percent()
    {
        var sessionId = await SeedSessionAsync(SeedResult.GroupA);
        var student = await CreateStudentAsync(SeedResult.GroupA);

        await SaveAttendanceAsync(CenterAdmin(), sessionId, Today, (student, AttendanceStatus.Absent));

        var stats = await GetStatsAsync(CenterAdmin());

        Assert.Equal(1, stats.TotalToday);
        Assert.Equal(0, stats.AttendanceRate);
    }
}

/// <summary>When every session is excused the denominator is zero: no rate.</summary>
public sealed class AttendanceRateAllExcusedTests : AttendanceStatsTestBase, IClassFixture<ScopeApiFactory>
{
    public AttendanceRateAllExcusedTests(ScopeApiFactory factory) : base(factory)
    {
    }

    [Fact]
    public async Task All_Excused_Has_No_Rate()
    {
        var sessionId = await SeedSessionAsync(SeedResult.GroupA);
        var student = await CreateStudentAsync(SeedResult.GroupA);

        await SaveAttendanceAsync(CenterAdmin(), sessionId, Today, (student, AttendanceStatus.Excused));

        var stats = await GetStatsAsync(CenterAdmin());

        Assert.Equal(1, stats.TotalToday);
        Assert.Equal(1, stats.ExcusedToday);
        Assert.Null(stats.AttendanceRate);
    }
}

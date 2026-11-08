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
/// The QR scanner records Present inside the existing 10-minute grace window
/// and Late beyond it. A repeated scan keeps the first result and answers
/// "already recorded", and no scan can reach another center or group.
/// </summary>
public sealed class AttendanceScanTests : IClassFixture<TimeControlledApiFactory>
{
    private static long _phoneSeed = DateTime.UtcNow.Ticks;
    private static long _codeSeed = 1_000_000;

    private readonly TimeControlledApiFactory _factory;
    private readonly SeedResult _seed;

    public AttendanceScanTests(TimeControlledApiFactory factory)
    {
        _factory = factory;
        _seed = _factory.EnsureSeeded();
    }

    private DateTime LocalNow => _factory.Clock.GetLocalNow().DateTime;

    [Fact]
    public async Task Scan_Within_Grace_Is_Present()
    {
        var sessionId = await SeedSession(_seed.GroupA, TimeOnly.FromDateTime(LocalNow.AddMinutes(-5)));
        var student = await CreateStudentAsync(_seed.GroupA);

        using var doc = await ScanAsync(CenterStaff(), student.QrCode, sessionId, Today());
        var root = doc.RootElement;

        Assert.True(root.GetProperty("succeeded").GetBoolean());
        Assert.Equal((int)AttendanceStatus.Present, root.GetProperty("data").GetProperty("status").GetInt32());
        Assert.False(root.GetProperty("data").GetProperty("alreadyRecorded").GetBoolean());
        Assert.Contains("حضور", root.GetProperty("message").GetString());
    }

    [Fact]
    public async Task Scan_After_Grace_Is_Late()
    {
        var sessionId = await SeedSession(_seed.GroupA, TimeOnly.FromDateTime(LocalNow.AddMinutes(-30)));
        var student = await CreateStudentAsync(_seed.GroupA);

        using var doc = await ScanAsync(CenterStaff(), student.QrCode, sessionId, Today());
        var root = doc.RootElement;

        Assert.True(root.GetProperty("succeeded").GetBoolean());
        Assert.Equal((int)AttendanceStatus.Late, root.GetProperty("data").GetProperty("status").GetInt32());
        Assert.Contains("تأخر", root.GetProperty("message").GetString());

        var stored = await FindAttendanceAsync(student.Id, sessionId, Today());
        Assert.NotNull(stored);
        Assert.Equal(AttendanceStatus.Late, stored!.Status);
        Assert.Equal(AttendanceSource.Scan, stored.Source);
    }

    [Fact]
    public async Task Scan_Of_A_Backdated_Session_Is_Present()
    {
        var sessionId = await SeedSession(_seed.GroupA, TimeOnly.FromDateTime(LocalNow.AddMinutes(-30)));
        var student = await CreateStudentAsync(_seed.GroupA);
        var date = Today().AddDays(-1);

        using var doc = await ScanAsync(CenterStaff(), student.QrCode, sessionId, date);

        Assert.Equal(
            (int)AttendanceStatus.Present,
            doc.RootElement.GetProperty("data").GetProperty("status").GetInt32());
    }

    [Fact]
    public async Task Scanning_Twice_Keeps_The_First_Result_And_Says_Already_Recorded()
    {
        var sessionId = await SeedSession(_seed.GroupA, TimeOnly.FromDateTime(LocalNow.AddMinutes(-5)));
        var student = await CreateStudentAsync(_seed.GroupA);
        var date = Today();

        using (var first = await ScanAsync(CenterStaff(), student.QrCode, sessionId, date))
        {
            Assert.False(first.RootElement.GetProperty("data")
                .GetProperty("alreadyRecorded").GetBoolean());
        }

        using var second = await ScanAsync(CenterStaff(), student.QrCode, sessionId, date);
        var root = second.RootElement;

        Assert.True(root.GetProperty("succeeded").GetBoolean());
        Assert.True(root.GetProperty("data").GetProperty("alreadyRecorded").GetBoolean());
        Assert.Contains("متسجل بالفعل", root.GetProperty("message").GetString());

        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var rows = await context.Attendances
            .IgnoreQueryFilters()
            .Where(a => a.StudentId == student.Id && a.SessionId == sessionId && a.AttendanceDate == date)
            .ToListAsync();

        Assert.Single(rows);
        Assert.Equal(AttendanceStatus.Present, rows[0].Status);
    }

    [Fact]
    public async Task Scan_Can_Correct_A_Manual_Absence()
    {
        var sessionId = await SeedSession(_seed.GroupA, TimeOnly.FromDateTime(LocalNow.AddMinutes(-5)));
        var student = await CreateStudentAsync(_seed.GroupA);
        var date = Today();

        await SaveAttendanceAsync(CenterStaff(), sessionId, date, student.Id, AttendanceStatus.Absent);

        using var doc = await ScanAsync(CenterStaff(), student.QrCode, sessionId, date);
        var root = doc.RootElement;

        Assert.Equal((int)AttendanceStatus.Present, root.GetProperty("data").GetProperty("status").GetInt32());
        Assert.False(root.GetProperty("data").GetProperty("alreadyRecorded").GetBoolean());

        var stored = await FindAttendanceAsync(student.Id, sessionId, date);
        Assert.Equal(AttendanceSource.Scan, stored!.Source);
    }

    [Fact]
    public async Task Teacher_Cannot_Scan_A_Session_Outside_His_Groups()
    {
        var sessionId = await SeedSession(_seed.GroupA, TimeOnly.FromDateTime(LocalNow.AddMinutes(-5)));
        var student = await CreateStudentAsync(_seed.GroupA);

        // Teacher B only teaches Group B, so a Group A session is not visible.
        using var response = await PostScanAsync(
            Client(AppRoles.Teacher, isCenterAdmin: false, _seed.CenterA, _seed.TeacherB),
            student.QrCode,
            sessionId,
            Today());

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Null(await FindAttendanceAsync(student.Id, sessionId, Today()));
    }

    [Fact]
    public async Task Another_Centers_Assistant_Cannot_Scan_This_Centers_Session()
    {
        var sessionId = await SeedSession(_seed.GroupA, TimeOnly.FromDateTime(LocalNow.AddMinutes(-5)));
        var student = await CreateStudentAsync(_seed.GroupA);

        using var response = await PostScanAsync(
            Client(AppRoles.Assistant, isCenterAdmin: false, _seed.CenterB, _seed.AssistantB),
            student.QrCode,
            sessionId,
            Today());

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Null(await FindAttendanceAsync(student.Id, sessionId, Today()));
    }

    // ---------------- helpers ----------------

    private DateOnly Today() => DateOnly.FromDateTime(LocalNow);

    private static string NewPhone()
        => "012" + (Interlocked.Increment(ref _phoneSeed) % 100_000_000).ToString("D8");

    private async Task<SeededStudent> CreateStudentAsync(Guid groupId)
    {
        var code = "STU" + Interlocked.Increment(ref _codeSeed).ToString("D8");

        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var student = new Student
        {
            Id = Guid.NewGuid(),
            FullName = "Scanned Student",
            PhoneNumber = NewPhone(),
            ParentPhoneNumber = NewPhone(),
            QrCode = code,
            CenterId = _seed.CenterA,
            SubscriptionType = SubscriptionType.Session
        };

        context.Students.Add(student);
        context.StudentGroups.Add(new StudentGroup
        {
            StudentId = student.Id,
            GroupId = groupId,
            CenterId = _seed.CenterA,
            IsActive = true,
            JoinDate = new DateTime(2026, 8, 1)
        });

        await context.SaveChangesAsync();

        return new SeededStudent(student.Id, code);
    }

    private async Task<Guid> SeedSession(Guid groupId, TimeOnly startTime)
    {
        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var session = new Session
        {
            Id = Guid.NewGuid(),
            GroupId = groupId,
            CenterId = _seed.CenterA,
            SessionPrice = 0,
            DayOfWeek = DayOfWeek.Saturday,
            StartTime = startTime,
            EndTime = startTime.AddHours(2)
        };

        context.Sessions.Add(session);
        await context.SaveChangesAsync();

        return session.Id;
    }

    private async Task<Attendance?> FindAttendanceAsync(Guid studentId, Guid sessionId, DateOnly date)
    {
        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        return await context.Attendances
            .IgnoreQueryFilters()
            .AsNoTracking()
            .FirstOrDefaultAsync(a =>
                a.StudentId == studentId &&
                a.SessionId == sessionId &&
                a.AttendanceDate == date);
    }

    private static async Task<JsonDocument> ScanAsync(
        HttpClient client,
        string code,
        Guid sessionId,
        DateOnly date)
    {
        var response = await PostScanAsync(client, code, sessionId, date);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        return JsonDocument.Parse(await response.Content.ReadAsStringAsync());
    }

    private static Task<HttpResponseMessage> PostScanAsync(
        HttpClient client,
        string code,
        Guid sessionId,
        DateOnly date)
    {
        var payload = JsonSerializer.Serialize(new
        {
            code,
            sessionId,
            attendanceDate = date.ToString("yyyy-MM-dd")
        });

        return client.PostAsync(
            Routing.AttendanceRouting.Scan,
            new StringContent(payload, Encoding.UTF8, "application/json"));
    }

    private static Task<HttpResponseMessage> SaveAttendanceAsync(
        HttpClient client,
        Guid sessionId,
        DateOnly date,
        Guid studentId,
        AttendanceStatus status)
    {
        var payload = JsonSerializer.Serialize(new
        {
            sessionId,
            attendanceDate = date.ToString("yyyy-MM-dd"),
            attendances = new[] { new { studentId, status = (int)status } }
        });

        return client.PostAsync(
            Routing.AttendanceRouting.Create,
            new StringContent(payload, Encoding.UTF8, "application/json"));
    }

    private HttpClient CenterStaff()
        => Client(AppRoles.Teacher, isCenterAdmin: true, _seed.CenterA, _seed.TeacherA);

    private HttpClient Client(string role, bool isCenterAdmin, Guid centerId, Guid subject)
    {
        var client = _factory.CreateClient(new WebApplicationFactoryClientOptions
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

    private sealed record SeededStudent(Guid Id, string QrCode);
}

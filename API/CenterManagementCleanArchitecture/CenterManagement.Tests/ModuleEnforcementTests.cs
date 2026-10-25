using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Net.Http.Headers;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using CenterManagement.Core.Features.Centers.Commands.Models;
using CenterManagement.Core.Features.Impersonation.Commands.Models;
using CenterManagement.Data.AppMetaData;
using CenterManagement.Data.Entities.Abstractions;
using CenterManagement.Data.Entities.Identity;
using CenterManagement.Data.Enums;
using CenterManagement.Infrustructure.Data;
using MediatR;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;

namespace CenterManagement.Tests;

/// <summary>
/// Proves per-center feature gating end-to-end: disabling a module returns
/// HTTP 403 with <c>MODULE_DISABLED</c> on every endpoint that belongs to it,
/// re-enabling restores access, a center with no module rows has all optional
/// modules off, every creation path provisions the rows, and the mixed DTOs
/// omit the disabled sections server-side.
/// </summary>
public sealed class ModuleEnforcementTests : IClassFixture<ScopeApiFactory>
{
    private readonly ScopeApiFactory _factory;
    private readonly SeedResult _seed;

    public ModuleEnforcementTests(ScopeApiFactory factory)
    {
        _factory = factory;
        _seed = _factory.EnsureSeeded();
    }

    // ---------------- A) per-module 403 / enable ----------------

    [Fact]
    public Task Attendance_Module_Gates_Attendance_Endpoints() =>
        AssertModuleGate(ModuleKeys.Attendance, "Api/V1/Attendance/stats", AppRoles.Teacher, isCenterAdmin: false);

    [Fact]
    public Task Payments_Module_Gates_Payment_Endpoints() =>
        AssertModuleGate(ModuleKeys.Payments, "Api/V1/Payments/GetAll", AppRoles.Teacher, isCenterAdmin: false);

    [Fact]
    public Task Accounting_Module_Gates_Income_Endpoints() =>
        AssertModuleGate(ModuleKeys.Accounting, "Api/V1/Income/Paginated?PageNumber=1&PageSize=10", AppRoles.Teacher, isCenterAdmin: false);

    [Fact]
    public Task Grades_Module_Gates_Grade_Endpoints() =>
        AssertModuleGate(ModuleKeys.Grades, $"Api/V1/Payments/get-grade-report/{_seed.StudentA}", AppRoles.Teacher, isCenterAdmin: false);

    [Fact]
    public Task QuestionBank_Module_Gates_QuestionBank_Endpoints() =>
        AssertModuleGate(ModuleKeys.QuestionBank, "Api/V1/QuestionBank/Paginated?PageNumber=1&PageSize=10", AppRoles.Teacher, isCenterAdmin: false);

    [Fact]
    public Task OnlineExams_Module_Gates_QuestionExam_Endpoints() =>
        AssertModuleGate(ModuleKeys.OnlineExams, "Api/V1/QuestionExam/Paginated?PageNumber=1&PageSize=10", AppRoles.Teacher, isCenterAdmin: false);

    [Fact]
    public Task StudyNotes_Module_Gates_StudyNote_Endpoints() =>
        AssertModuleGate(ModuleKeys.StudyNotes, "Api/V1/StudyNote/Paginated?PageNumber=1&PageSize=10", AppRoles.Teacher, isCenterAdmin: false);

    [Fact]
    public Task CenterReports_Module_Gates_Reports_Overview() =>
        AssertModuleGate(ModuleKeys.CenterReports, "Api/V1/Reports/Overview", AppRoles.Teacher, isCenterAdmin: false);

    [Fact]
    public async Task StudentPortal_Module_Gates_Portal_Profile()
    {
        // A real login account linked to a Student row is required (the access
        // middleware and the portal handler both resolve the user); the center
        // comes from the claim.
        var portalUserId = CreatePortalStudent(_seed.CenterA);

        await AssertModuleGateForRole(
            ModuleKeys.StudentPortal,
            "Api/V1/StudentPortal/Profile",
            AppRoles.Student,
            isCenterAdmin: false,
            subjectUserId: portalUserId);
    }

    // ---------------- B) no rows => disabled ----------------

    [Fact]
    public async Task Center_Without_ModuleRows_Has_All_Optional_Modules_Disabled()
    {
        // A brand-new center that never received module rows: every optional
        // module must read as disabled.
        var (centerId, userId) = CreateBareCenterWithTeacher();

        var response = await Client(AppRoles.Teacher, isCenterAdmin: false, centerOverride: centerId, subjectOverride: userId)
            .GetAsync("Api/V1/Attendance/stats");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        Assert.Contains(ModuleAccessCodes.ModuleDisabled, await response.Content.ReadAsStringAsync());
    }

    // ---------------- C) every creation path provisions rows ----------------

    [Fact]
    public async Task AddCenter_Command_Provisions_All_Module_Rows()
    {
        using var scope = _factory.Services.CreateScope();
        var mediator = scope.ServiceProvider.GetRequiredService<IMediator>();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var result = await mediator.Send(new AddCenterCommand { Name = $"AddCenter Path {Guid.NewGuid():N}" });
        Assert.True(result.Succeeded, result.Message);

        var newCenter = await context.Centers
            .IgnoreQueryFilters()
            .OrderByDescending(c => c.CreatedAt)
            .FirstAsync(c => c.Name.StartsWith("AddCenter Path"));

        var rows = await context.CenterModules
            .IgnoreQueryFilters()
            .Where(m => m.CenterId == newCenter.Id && !m.IsDeleted)
            .Select(m => m.ModuleKey)
            .ToListAsync();

        Assert.Equal(ModuleKeys.All.Length, rows.Count);
        Assert.Equal(11, rows.Count);
    }

    [Fact]
    public async Task OnboardCenterOwner_Command_Provisions_All_Module_Rows()
    {
        using var scope = _factory.Services.CreateScope();
        var mediator = scope.ServiceProvider.GetRequiredService<IMediator>();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var suffix = Guid.NewGuid().ToString("N");
        var numericSuffix = new string(suffix.Where(char.IsDigit).Take(8).ToArray()).PadRight(8, '0');
        var result = await mediator.Send(new OnboardCenterOwnerCommand
        {
            AccountType = AppRoles.CenterOwner,
            OwnerFullName = "Onboard Path Owner",
            OwnerPhone = $"011{numericSuffix}",
            OwnerPassword = "Owner@12345",
            CenterName = $"Onboard Path {suffix}"
        });

        Assert.True(result.Succeeded, result.Message);

        var rows = await context.CenterModules
            .IgnoreQueryFilters()
            .Where(m => m.CenterId == result.Data.CenterId && !m.IsDeleted)
            .ToListAsync();

        Assert.Equal(11, rows.Count);
    }

    [Fact]
    public async Task Seeded_Centers_Provision_All_Module_Rows()
    {
        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var rows = await context.CenterModules
            .IgnoreQueryFilters()
            .Where(m => m.CenterId == _seed.CenterA && !m.IsDeleted)
            .Select(m => m.ModuleKey)
            .ToListAsync();

        Assert.Equal(11, rows.Count);
        Assert.Equal(
            ModuleKeys.All.OrderBy(k => k),
            rows.OrderBy(k => k));
    }

    // ---------------- D) DTO omission ----------------

    [Fact]
    public async Task DashboardSummary_Omits_Finance_When_Payments_And_Accounting_Off()
    {
        SetModule(_seed.CenterA, ModuleKeys.Payments, false);
        SetModule(_seed.CenterA, ModuleKeys.Accounting, false);
        try
        {
            var response = await Client(AppRoles.Teacher, isCenterAdmin: true)
                .GetAsync("dashboard-summary?year=2026&month=8");

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
            var data = doc.RootElement.GetProperty("data");

            Assert.Equal(JsonValueKind.Null, data.GetProperty("monthlyRevenue").ValueKind);
            Assert.Equal(JsonValueKind.Null, data.GetProperty("monthlyExpenses").ValueKind);
            Assert.Equal(JsonValueKind.Null, data.GetProperty("netProfit").ValueKind);
            // Attendance stays because its module is still enabled.
            Assert.NotEqual(JsonValueKind.Null, data.GetProperty("attendancePercentage").ValueKind);
        }
        finally
        {
            SetModule(_seed.CenterA, ModuleKeys.Payments, true);
            SetModule(_seed.CenterA, ModuleKeys.Accounting, true);
        }
    }

    [Fact]
    public async Task DashboardSummary_Omits_Attendance_When_Attendance_Off()
    {
        SetModule(_seed.CenterA, ModuleKeys.Attendance, false);
        try
        {
            var response = await Client(AppRoles.Teacher, isCenterAdmin: true)
                .GetAsync("dashboard-summary?year=2026&month=8");

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
            var data = doc.RootElement.GetProperty("data");

            Assert.Equal(JsonValueKind.Null, data.GetProperty("attendancePercentage").ValueKind);
            Assert.Equal(JsonValueKind.Null, data.GetProperty("monthlyPresentCount").ValueKind);
        }
        finally
        {
            SetModule(_seed.CenterA, ModuleKeys.Attendance, true);
        }
    }

    [Fact]
    public async Task ReportsOverview_Omits_Finance_When_Payments_Off()
    {
        SetModule(_seed.CenterA, ModuleKeys.Payments, false);
        try
        {
            var response = await Client(AppRoles.Teacher, isCenterAdmin: false)
                .GetAsync("Api/V1/Reports/Overview");

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
            var data = doc.RootElement.GetProperty("data");

            Assert.Equal(JsonValueKind.Null, data.GetProperty("monthlyRevenue").ValueKind);
        }
        finally
        {
            SetModule(_seed.CenterA, ModuleKeys.Payments, true);
        }
    }

    // ---------------- E) impersonation ----------------

    [Fact]
    public async Task Impersonated_Session_Is_Still_Blocked_By_A_Disabled_Module()
    {
        // An impersonated session bypasses suspended/expired (support tooling) but
        // is NOT exempt from feature modules: a disabled module still returns 403.
        SetModule(_seed.CenterA, ModuleKeys.Attendance, false);
        try
        {
            var token = CreateImpersonationToken(_seed.TeacherA, AppRoles.Teacher, _seed.CenterA, Guid.NewGuid());

            var response = await ClientWithToken(token).GetAsync("Api/V1/Attendance/stats");

            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
            Assert.Contains(ModuleAccessCodes.ModuleDisabled, await response.Content.ReadAsStringAsync());
        }
        finally
        {
            SetModule(_seed.CenterA, ModuleKeys.Attendance, true);
        }
    }

    [Fact]
    public async Task Impersonated_Session_Bypasses_Suspended_And_Expired_Centers()
    {
        var superAdminId = Guid.NewGuid();

        // Suspended center: a real teacher is blocked, an impersonated session is not.
        var (suspendedCenter, suspendedUser) =
            CreateCenterWithTeacher(isActive: true, CenterStatus.Suspended, subscriptionEnd: null, graceDays: 3);

        var realBlocked = await Client(AppRoles.Teacher, isCenterAdmin: false, centerOverride: suspendedCenter, subjectOverride: suspendedUser)
            .GetAsync("Api/V1/Attendance/stats");
        Assert.Equal(HttpStatusCode.Forbidden, realBlocked.StatusCode);

        var impersonated = await ClientWithToken(
                CreateImpersonationToken(suspendedUser, AppRoles.Teacher, suspendedCenter, superAdminId))
            .GetAsync("Api/V1/Attendance/stats");
        Assert.NotEqual(HttpStatusCode.Forbidden, impersonated.StatusCode);

        // Expired center (past end date, zero grace): same expectation.
        var (expiredCenter, expiredUser) =
            CreateCenterWithTeacher(isActive: true, CenterStatus.Active, subscriptionEnd: DateTime.UtcNow.AddDays(-10), graceDays: 0);

        var expiredBlocked = await Client(AppRoles.Teacher, isCenterAdmin: false, centerOverride: expiredCenter, subjectOverride: expiredUser)
            .GetAsync("Api/V1/Attendance/stats");
        Assert.Equal(HttpStatusCode.Forbidden, expiredBlocked.StatusCode);

        var impersonatedExpired = await ClientWithToken(
                CreateImpersonationToken(expiredUser, AppRoles.Teacher, expiredCenter, superAdminId))
            .GetAsync("Api/V1/Attendance/stats");
        Assert.NotEqual(HttpStatusCode.Forbidden, impersonatedExpired.StatusCode);
    }

    // ---------------- helpers ----------------

    private async Task AssertModuleGate(string moduleKey, string route, string role, bool isCenterAdmin)
    {
        SetModule(_seed.CenterA, moduleKey, false);

        var disabled = await Client(role, isCenterAdmin).GetAsync(route);
        Assert.Equal(HttpStatusCode.Forbidden, disabled.StatusCode);
        Assert.Contains(ModuleAccessCodes.ModuleDisabled, await disabled.Content.ReadAsStringAsync());

        SetModule(_seed.CenterA, moduleKey, true);

        var enabled = await Client(role, isCenterAdmin).GetAsync(route);
        Assert.True(
            enabled.StatusCode == HttpStatusCode.OK,
            $"Expected 200 after enabling '{moduleKey}' on {route}, got {(int)enabled.StatusCode}.");
    }

    private async Task AssertModuleGateForRole(
        string moduleKey,
        string route,
        string role,
        bool isCenterAdmin,
        Guid subjectUserId)
    {
        // The portal login is the account subject, while the tenant/center comes
        // from the CenterId claim.
        SetModule(_seed.CenterA, moduleKey, false);

        var disabled = await Client(role, isCenterAdmin, centerOverride: _seed.CenterA, subjectOverride: subjectUserId).GetAsync(route);
        Assert.Equal(HttpStatusCode.Forbidden, disabled.StatusCode);
        Assert.Contains(ModuleAccessCodes.ModuleDisabled, await disabled.Content.ReadAsStringAsync());

        SetModule(_seed.CenterA, moduleKey, true);

        var enabled = await Client(role, isCenterAdmin, centerOverride: _seed.CenterA, subjectOverride: subjectUserId).GetAsync(route);
        Assert.NotEqual(HttpStatusCode.Forbidden, enabled.StatusCode);
    }

    private void SetModule(Guid centerId, string moduleKey, bool enabled)
    {
        using (var scope = _factory.Services.CreateScope())
        {
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

            // The service caches the enabled set per center; drop it so the
            // change is visible immediately.
            scope.ServiceProvider.GetRequiredService<ICenterModuleService>().Invalidate(centerId);
        }
    }

    private Guid CreateUser(Guid centerId, string fullName)
    {
        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var phone = "011" + (DateTime.UtcNow.Ticks % 100_000_000).ToString("D8");

        var user = new User
        {
            Id = Guid.NewGuid(),
            FullName = fullName,
            UserName = phone,
            PhoneNumber = phone,
            EmailConfirmed = true,
            CenterId = centerId
        };

        context.Users.Add(user);
        context.SaveChanges();
        return user.Id;
    }

    private (Guid CenterId, Guid UserId) CreateBareCenterWithTeacher()
    {
        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var center = new CenterManagement.Data.Entities.Center
        {
            Name = $"Bare Center {Guid.NewGuid():N}",
            IsActive = true
        };
        context.Centers.Add(center);
        context.SaveChanges();

        var userId = CreateUser(center.Id, "Bare Center Teacher");

        return (center.Id, userId);
    }

    private Guid CreatePortalStudent(Guid centerId)
    {
        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var phone = "011" + (DateTime.UtcNow.Ticks % 100_000_000).ToString("D8");

        var user = new User
        {
            Id = Guid.NewGuid(),
            FullName = "Portal Student",
            UserName = phone,
            PhoneNumber = phone,
            EmailConfirmed = true,
            CenterId = centerId
        };
        context.Users.Add(user);

        context.Students.Add(new CenterManagement.Data.Entities.Users.Student
        {
            Id = Guid.NewGuid(),
            FullName = "Portal Student",
            PhoneNumber = phone,
            ParentPhoneNumber = phone,
            CenterId = centerId,
            UserId = user.Id
        });

        context.SaveChanges();
        return user.Id;
    }

    private HttpClient Client(string role, bool isCenterAdmin, Guid? centerOverride = null, Guid? subjectOverride = null)
    {
        var client = _factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            BaseAddress = new Uri("https://localhost"),
            AllowAutoRedirect = false
        });

        var subject = subjectOverride ?? SubjectForRole(role);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(
            "Bearer",
            CreateToken(subject, role, centerOverride ?? _seed.CenterA, isCenterAdmin));

        return client;
    }

    private Guid SubjectForRole(string role) => role == AppRoles.Teacher ? _seed.TeacherA : _seed.CenterOwnerA;

    private (Guid CenterId, Guid UserId) CreateCenterWithTeacher(
        bool isActive,
        CenterStatus status,
        DateTime? subscriptionEnd,
        int graceDays)
    {
        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var center = new CenterManagement.Data.Entities.Center
        {
            Name = $"Impersonation Center {Guid.NewGuid():N}",
            IsActive = isActive,
            Status = status,
            SubscriptionStart = subscriptionEnd?.AddYears(-1),
            SubscriptionEnd = subscriptionEnd,
            GraceDays = graceDays
        };
        context.Centers.Add(center);
        context.SaveChanges();

        // All optional modules enabled so only the center access state differs.
        context.CenterModules.AddRange(CenterModuleFactory.CreateFullSet(center.Id));
        context.SaveChanges();

        var userId = CreateUser(center.Id, "Impersonation Target");

        return (center.Id, userId);
    }

    private HttpClient ClientWithToken(string token)
    {
        var client = _factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            BaseAddress = new Uri("https://localhost"),
            AllowAutoRedirect = false
        });

        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        return client;
    }

    private static string CreateImpersonationToken(Guid subjectUserId, string role, Guid centerId, Guid superAdminId)
    {
        var extra = new List<Claim>
        {
            new Claim(ImpersonationClaims.ImpersonatedBy, superAdminId.ToString()),
            new Claim(ImpersonationClaims.IsImpersonation, ImpersonationClaims.TrueValue)
        };

        return CreateToken(subjectUserId, role, centerId, isCenterAdmin: false, extraClaims: extra);
    }

    private static string CreateToken(
        Guid userId,
        string role,
        Guid centerId,
        bool isCenterAdmin,
        IEnumerable<Claim>? extraClaims = null)
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
}

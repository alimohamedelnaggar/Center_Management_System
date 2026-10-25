using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Net.Http.Headers;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using CenterManagement.Data.AppMetaData;
using CenterManagement.Data.Entities;
using CenterManagement.Data.Entities.Abstractions;
using CenterManagement.Data.Entities.Expenses;
using CenterManagement.Data.Entities.Groups;
using CenterManagement.Data.Entities.Identity;
using CenterManagement.Data.Entities.Incomes;
using CenterManagement.Data.Entities.Users;
using CenterManagement.Data.Enums;
using CenterManagement.Infrustructure.Data;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;

namespace CenterManagement.Tests;

/// <summary>
/// Covers the center-wide reports endpoint (policy CenterAdmin):
/// <list type="bullet">
/// <item>per-group expected / collected / outstanding for a billing month;</item>
/// <item>outstanding parity with the overdue page (single + two-group students);</item>
/// <item>per-group sums equal the center total;</item>
/// <item>finance lines with student payments and other incomes kept separate;</item>
/// <item>per-teacher collected + attendance rate;</item>
/// <item>tenant isolation; assistant / regular-teacher are rejected.</item>
/// </list>
/// Each test gets its own SQLite-backed host so the center-wide aggregates are
/// deterministic (the endpoint has no search filter to isolate fixtures).
/// </summary>
public sealed class CenterReportsTests : IDisposable
{
    private const string Url = "Api/V1/Reports/Center-Overview";
    private const string OverdueUrl = "Api/V1/Payments/overdue-students";

    private const string AugustQuery =
        "from=2026-08-01&to=2026-09-01&billingPeriod=2026-08-01";

    private readonly ScopeApiFactory _factory;
    private readonly SeedResult _seed;

    public CenterReportsTests()
    {
        _factory = new ScopeApiFactory();
        _seed = _factory.EnsureSeeded();
    }

    public void Dispose() => _factory.Dispose();

    // ============================================================
    // Outstanding parity with the overdue page
    // ============================================================

    [Fact]
    public async Task Outstanding_Matches_Overdue_Totals_Including_Two_Group_Student()
    {
        // Single student, Group A, nothing paid.
        SeedMonthlyStudent(_seed.CenterA, _seed.GroupA, "CRP_Single", new DateTime(2026, 8, 1));

        // Two-group student: Group A fully paid, Group B untouched.
        var twoGroups = SeedMonthlyStudentInTwoGroups(
            _seed.CenterA, _seed.GroupA, _seed.GroupB, "CRP_TwoGroups", new DateTime(2026, 8, 1));
        SeedMonthlyPayment(_seed.CenterA, _seed.GroupA, twoGroups, total: 100, paid: 100, PaymentStatus.FullyPaid);

        // Overdue page (August): only the two unpaid rows remain.
        using var overdue = await GetOverdue();
        var overdueMeta = overdue.RootElement.GetProperty("meta");
        Assert.Equal(200, overdueMeta.GetProperty("totalRemaining").GetDecimal());

        // Center-wide report for the same billing month.
        using var reports = await GetReports();
        var groups = reports.RootElement.GetProperty("data").GetProperty("groups")
            .EnumerateArray().ToList();

        var outstanding = groups.Sum(g => g.GetProperty("outstanding").GetDecimal());
        var expected = groups.Sum(g => g.GetProperty("expected").GetDecimal());
        var collected = groups.Sum(g => g.GetProperty("collected").GetDecimal());

        // Outstanding is the SAME number the overdue page reports.
        Assert.Equal(overdueMeta.GetProperty("totalRemaining").GetDecimal(), outstanding);

        // Expected / collected include the fully-paid row too.
        Assert.Equal(300, expected);
        Assert.Equal(100, collected);

        var groupA = groups.Single(g => g.GetProperty("groupId").GetGuid() == _seed.GroupA);
        var groupB = groups.Single(g => g.GetProperty("groupId").GetGuid() == _seed.GroupB);
        Assert.Equal(100, groupA.GetProperty("outstanding").GetDecimal());
        Assert.Equal(100, groupB.GetProperty("outstanding").GetDecimal());
    }

    [Fact]
    public async Task Per_Group_Sums_Equal_The_Center_Total_When_Nothing_Is_Fully_Paid()
    {
        SeedMonthlyStudent(_seed.CenterA, _seed.GroupA, "CRE_A1", new DateTime(2026, 8, 1));

        var a2 = SeedMonthlyStudent(_seed.CenterA, _seed.GroupA, "CRE_A2", new DateTime(2026, 8, 1));
        SeedMonthlyPayment(_seed.CenterA, _seed.GroupA, a2, total: 100, paid: 40, PaymentStatus.PartialPaid);

        SeedMonthlyStudent(_seed.CenterA, _seed.GroupB, "CRE_B1", new DateTime(2026, 8, 1));

        using var overdue = await GetOverdue();
        var overdueMeta = overdue.RootElement.GetProperty("meta");

        using var reports = await GetReports();
        var groups = reports.RootElement.GetProperty("data").GetProperty("groups")
            .EnumerateArray().ToList();

        Assert.Equal(overdueMeta.GetProperty("totalDue").GetDecimal(),
            groups.Sum(g => g.GetProperty("expected").GetDecimal()));
        Assert.Equal(overdueMeta.GetProperty("totalPaid").GetDecimal(),
            groups.Sum(g => g.GetProperty("collected").GetDecimal()));
        Assert.Equal(overdueMeta.GetProperty("totalRemaining").GetDecimal(),
            groups.Sum(g => g.GetProperty("outstanding").GetDecimal()));

        Assert.Equal(300, overdueMeta.GetProperty("totalDue").GetDecimal());
        Assert.Equal(40, overdueMeta.GetProperty("totalPaid").GetDecimal());
        Assert.Equal(260, overdueMeta.GetProperty("totalRemaining").GetDecimal());
    }

    // ============================================================
    // Finance lines (no double counting)
    // ============================================================

    [Fact]
    public async Task Finance_Reports_Student_Payments_And_Other_Incomes_Separately()
    {
        var student = SeedMonthlyStudent(_seed.CenterA, _seed.GroupA, "CRF_Paid", new DateTime(2026, 8, 1));
        SeedMonthlyPayment(_seed.CenterA, _seed.GroupA, student, total: 100, paid: 100, PaymentStatus.FullyPaid);

        using var reports = await GetReports();
        var finance = reports.RootElement.GetProperty("data").GetProperty("finance");

        // Student payment (100) is NOT folded into other incomes.
        Assert.Equal(100, finance.GetProperty("studentPaymentsCollected").GetDecimal());

        // TestData seeds Income A (100, Group A) + Income B (200, Group B) in August.
        Assert.Equal(300, finance.GetProperty("otherIncomes").GetDecimal());

        Assert.Equal(0, finance.GetProperty("expenses").GetDecimal());
        Assert.Equal(0, finance.GetProperty("assistantSalaries").GetDecimal());

        // Net = payments + other incomes - expenses - salaries.
        Assert.Equal(400, finance.GetProperty("net").GetDecimal());
    }

    // ============================================================
    // Range boundary: From inclusive, To exclusive
    // ============================================================

    [Fact]
    public async Task Range_From_Is_Inclusive_And_To_Is_Exclusive()
    {
        // Range [2026-08-01, 2026-09-01) => August 2026.
        var s1 = SeedMonthlyStudent(_seed.CenterA, _seed.GroupA, "BND_First", new DateTime(2026, 8, 1));
        var s2 = SeedMonthlyStudent(_seed.CenterA, _seed.GroupA, "BND_Last", new DateTime(2026, 8, 1));
        var s3 = SeedMonthlyStudent(_seed.CenterA, _seed.GroupA, "BND_After", new DateTime(2026, 8, 1));

        // Payment on the first day (in) and the last day (in); the exclusive
        // bound's day is out.
        SeedPaymentOn(_seed.CenterA, _seed.GroupA, s1, 10, new DateTime(2026, 8, 1));
        SeedPaymentOn(_seed.CenterA, _seed.GroupA, s2, 20, new DateTime(2026, 8, 31));
        SeedPaymentOn(_seed.CenterA, _seed.GroupA, s3, 40, new DateTime(2026, 9, 1));

        var expenseCategory = SeedExpenseCategory(_seed.CenterA);
        SeedExpenseOn(_seed.CenterA, expenseCategory, 100, new DateOnly(2026, 8, 1));
        SeedExpenseOn(_seed.CenterA, expenseCategory, 200, new DateOnly(2026, 8, 31));
        SeedExpenseOn(_seed.CenterA, expenseCategory, 400, new DateOnly(2026, 9, 1));

        SeedIncomeOn(_seed.CenterA, _seed.IncomeCategoryA, 1, new DateOnly(2026, 8, 1));
        SeedIncomeOn(_seed.CenterA, _seed.IncomeCategoryA, 2, new DateOnly(2026, 8, 31));
        SeedIncomeOn(_seed.CenterA, _seed.IncomeCategoryA, 4, new DateOnly(2026, 9, 1));

        using var reports = await GetReports();
        var data = reports.RootElement.GetProperty("data");
        var finance = data.GetProperty("finance");

        // The exclusive bound is echoed back so the caller can label the range.
        Assert.Equal("2026-08-01", data.GetProperty("from").GetString());
        Assert.Equal("2026-09-01", data.GetProperty("to").GetString());

        // First (10) + last (20) counted; the bound day (40) excluded.
        Assert.Equal(30, finance.GetProperty("studentPaymentsCollected").GetDecimal());

        // TestData seeds 300 of August income (Income A + B on 2026-08-01).
        // First (1) + last (2) counted; the bound day (4) excluded.
        Assert.Equal(303, finance.GetProperty("otherIncomes").GetDecimal());

        // First (100) + last (200) counted; the bound day (400) excluded.
        Assert.Equal(300, finance.GetProperty("expenses").GetDecimal());
    }

    // ============================================================
    // Assistant salaries use the (Year, Month) window of the range
    // ============================================================

    [Fact]
    public async Task Assistant_Salaries_Count_Only_Months_Inside_The_Range()
    {
        // August salary is inside [2026-08-01, 2026-09-01); September is out.
        SeedAssistantPayment(_seed.CenterA, _seed.AssistantA, 2026, 8, 500);
        SeedAssistantPayment(_seed.CenterA, _seed.AssistantA, 2026, 9, 999);

        using var reports = await GetReports();
        var finance = reports.RootElement.GetProperty("data").GetProperty("finance");

        Assert.Equal(500, finance.GetProperty("assistantSalaries").GetDecimal());
    }

    // ============================================================
    // Per teacher
    // ============================================================

    [Fact]
    public async Task Per_Teacher_Reports_Collected_And_Attendance_Rate()
    {
        LinkTeacherRole(_seed.TeacherA);
        LinkTeacherRole(_seed.TeacherB);

        var student = SeedMonthlyStudent(_seed.CenterA, _seed.GroupA, "CRT_Kid", new DateTime(2026, 8, 1));
        SeedMonthlyPayment(_seed.CenterA, _seed.GroupA, student, total: 100, paid: 100, PaymentStatus.FullyPaid);

        // Two attendance rows for Group A's session in August: 1 present, 1 absent.
        SeedAttendance(_seed.CenterA, _seed.GroupA, student, present: true, day: new DateTime(2026, 8, 10));
        SeedAttendance(_seed.CenterA, _seed.GroupA, student, present: false, day: new DateTime(2026, 8, 11));

        using var reports = await GetReports();
        var teachers = reports.RootElement.GetProperty("data").GetProperty("teachers")
            .EnumerateArray().ToList();

        var teacherA = teachers.Single(t => t.GetProperty("teacherId").GetGuid() == _seed.TeacherA);
        Assert.Equal(1, teacherA.GetProperty("groupsCount").GetInt32());
        // Group A holds TestData's Student A plus the seeded CRT_Kid.
        Assert.Equal(2, teacherA.GetProperty("studentsCount").GetInt32());
        Assert.Equal(100, teacherA.GetProperty("collectedInRange").GetDecimal());
        Assert.Equal(50, teacherA.GetProperty("attendanceRate").GetDouble());

        var teacherB = teachers.Single(t => t.GetProperty("teacherId").GetGuid() == _seed.TeacherB);
        Assert.Equal(0, teacherB.GetProperty("collectedInRange").GetDecimal());
    }

    // ============================================================
    // Tenant isolation
    // ============================================================

    [Fact]
    public async Task Reports_Are_Isolated_Between_Centers()
    {
        // Center B starts empty.
        using (var centerB = await GetReports(CenterBOwner()))
        {
            var data = centerB.RootElement.GetProperty("data");
            Assert.Equal(0, data.GetProperty("totals").GetProperty("groups").GetInt32());
            Assert.Equal(0, data.GetProperty("finance").GetProperty("studentPaymentsCollected").GetDecimal());
            Assert.Equal(0, data.GetProperty("finance").GetProperty("otherIncomes").GetDecimal());
        }

        // Seed a Center B monthly student with a payment.
        var groupB = SeedGroup(_seed.CenterB, "Center B Group");
        var studentB = SeedMonthlyStudent(_seed.CenterB, groupB, "ISO_KidB", new DateTime(2026, 8, 1));
        SeedMonthlyPayment(_seed.CenterB, groupB, studentB, total: 100, paid: 100, PaymentStatus.FullyPaid);

        using (var centerB = await GetReports(CenterBOwner()))
        {
            var finance = centerB.RootElement.GetProperty("data").GetProperty("finance");
            Assert.Equal(100, finance.GetProperty("studentPaymentsCollected").GetDecimal());
        }

        // Center A owner never sees Center B's money; it only sees its own incomes.
        using var centerA = await GetReports(CenterAOwner());
        var aFinance = centerA.RootElement.GetProperty("data").GetProperty("finance");
        Assert.Equal(0, aFinance.GetProperty("studentPaymentsCollected").GetDecimal());
        Assert.Equal(300, aFinance.GetProperty("otherIncomes").GetDecimal());
    }

    // ============================================================
    // Authorization
    // ============================================================

    [Fact]
    public async Task Assistant_Is_Forbidden()
    {
        var response = await Client(_seed.AssistantA, AppRoles.Assistant, _seed.CenterA).GetAsync(Url);
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Regular_Teacher_Is_Forbidden()
    {
        var response = await Client(_seed.TeacherA, AppRoles.Teacher, _seed.CenterA).GetAsync(Url);
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Solo_Teacher_And_Center_Owner_Are_Allowed()
    {
        var solo = await SoloTeacher().GetAsync(Url);
        Assert.Equal(HttpStatusCode.OK, solo.StatusCode);

        var owner = await CenterAOwner().GetAsync(Url);
        Assert.Equal(HttpStatusCode.OK, owner.StatusCode);
    }

    // ============================================================
    // Helpers
    // ============================================================

    private async Task<JsonDocument> GetReports(HttpClient? client = null)
    {
        client ??= CenterAOwner();

        var response = await client.GetAsync($"{Url}?{AugustQuery}");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        return JsonDocument.Parse(await response.Content.ReadAsStringAsync());
    }

    private async Task<JsonDocument> GetOverdue()
    {
        var response = await CenterAOwner().GetAsync($"{OverdueUrl}?billingPeriod=2026-08-01");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        return JsonDocument.Parse(await response.Content.ReadAsStringAsync());
    }

    private HttpClient CenterAOwner() =>
        Client(_seed.CenterOwnerA, AppRoles.CenterOwner, _seed.CenterA);

    private HttpClient CenterBOwner()
    {
        using var scope = _factory.Services.CreateScope();
        var ctx = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var owner = new User
        {
            Id = Guid.NewGuid(),
            FullName = "Center B Owner",
            PhoneNumber = "01000000177",
            CenterId = _seed.CenterB
        };
        ctx.Users.Add(owner);
        ctx.SaveChanges();

        return Client(owner.Id, AppRoles.CenterOwner, _seed.CenterB);
    }

    private HttpClient SoloTeacher() =>
        Client(_seed.SoloTeacherA, AppRoles.Teacher, _seed.CenterA, isCenterAdmin: true);

    private HttpClient Client(Guid userId, string role, Guid centerId, bool isCenterAdmin = false)
    {
        var client = _factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            BaseAddress = new Uri("https://localhost"),
            AllowAutoRedirect = false
        });

        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", CreateToken(userId, role, centerId, isCenterAdmin));

        return client;
    }

    private static string CreateToken(Guid userId, string role, Guid centerId, bool isCenterAdmin = false)
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

    private Guid SeedGroup(Guid centerId, string name)
    {
        using var scope = _factory.Services.CreateScope();
        var ctx = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var group = new Group
        {
            Id = Guid.NewGuid(),
            Name = name,
            CenterId = centerId,
            MonthlyPrice = 100,
            SessionsPerMonth = 8
        };
        ctx.Groups.Add(group);
        ctx.SaveChanges();
        return group.Id;
    }

    private Guid SeedMonthlyStudent(Guid centerId, Guid groupId, string name, DateTime joinDate)
    {
        using var scope = _factory.Services.CreateScope();
        var ctx = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var student = new Student
        {
            Id = Guid.NewGuid(),
            FullName = name,
            PhoneNumber = "0121000" + Random.Shared.Next(1000, 9999),
            ParentPhoneNumber = "0122000" + Random.Shared.Next(1000, 9999),
            CenterId = centerId,
            SubscriptionType = SubscriptionType.Month
        };

        ctx.Students.Add(student);
        ctx.StudentGroups.Add(new StudentGroup
        {
            StudentId = student.Id,
            GroupId = groupId,
            CenterId = centerId,
            IsActive = true,
            JoinDate = joinDate
        });
        ctx.SaveChanges();
        return student.Id;
    }

    private Guid SeedMonthlyStudentInTwoGroups(
        Guid centerId, Guid groupA, Guid groupB, string name, DateTime joinDate)
    {
        using var scope = _factory.Services.CreateScope();
        var ctx = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var student = new Student
        {
            Id = Guid.NewGuid(),
            FullName = name,
            PhoneNumber = "0121000" + Random.Shared.Next(1000, 9999),
            ParentPhoneNumber = "0122000" + Random.Shared.Next(1000, 9999),
            CenterId = centerId,
            SubscriptionType = SubscriptionType.Month
        };

        ctx.Students.Add(student);
        ctx.StudentGroups.Add(new StudentGroup { StudentId = student.Id, GroupId = groupA, CenterId = centerId, IsActive = true, JoinDate = joinDate });
        ctx.StudentGroups.Add(new StudentGroup { StudentId = student.Id, GroupId = groupB, CenterId = centerId, IsActive = true, JoinDate = joinDate });
        ctx.SaveChanges();
        return student.Id;
    }

    private void SeedMonthlyPayment(
        Guid centerId, Guid groupId, Guid studentId, decimal total, decimal paid, PaymentStatus status)
    {
        using var scope = _factory.Services.CreateScope();
        var ctx = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var payment = new Payment
        {
            Id = Guid.NewGuid(),
            CenterId = centerId,
            GroupId = groupId,
            StudentId = studentId,
            PaymentDate = new DateTime(2026, 8, 15, 10, 0, 0),
            ReceivedAt = new DateTime(2026, 8, 15, 8, 0, 0, DateTimeKind.Utc),
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
            Status = status
        });

        ctx.Payments.Add(payment);
        ctx.SaveChanges();
    }

    private void SeedAttendance(Guid centerId, Guid groupId, Guid studentId, bool present, DateTime day)
    {
        using var scope = _factory.Services.CreateScope();
        var ctx = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var session = new Session
        {
            Id = Guid.NewGuid(),
            GroupId = groupId,
            CenterId = centerId,
            SessionPrice = 0,
            DayOfWeek = day.DayOfWeek,
            StartTime = new TimeOnly(10, 0),
            EndTime = new TimeOnly(12, 0)
        };
        ctx.Sessions.Add(session);

        ctx.Attendances.Add(new Attendance
        {
            StudentId = studentId,
            SessionId = session.Id,
            CenterId = centerId,
            AttendanceDate = DateOnly.FromDateTime(day),
            Status = present ? AttendanceStatus.Present : AttendanceStatus.Absent
        });

        ctx.SaveChanges();
    }

    private void LinkTeacherRole(Guid teacherId)
    {
        using var scope = _factory.Services.CreateScope();
        var ctx = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var roleId = ctx.Roles.Where(r => r.Name == AppRoles.Teacher).Select(r => r.Id).FirstOrDefault();
        if (roleId == Guid.Empty)
            return;

        if (ctx.UserRoles.Any(ur => ur.UserId == teacherId && ur.RoleId == roleId))
            return;

        ctx.UserRoles.Add(new IdentityUserRole<Guid> { UserId = teacherId, RoleId = roleId });
        ctx.SaveChanges();
    }

    private void SeedPaymentOn(
        Guid centerId, Guid groupId, Guid studentId, decimal amount, DateTime paymentDate)
    {
        using var scope = _factory.Services.CreateScope();
        var ctx = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var payment = new Payment
        {
            Id = Guid.NewGuid(),
            CenterId = centerId,
            GroupId = groupId,
            StudentId = studentId,
            PaymentDate = paymentDate,
            ReceivedAt = DateTime.SpecifyKind(paymentDate, DateTimeKind.Utc),
            BillingPeriod = new DateOnly(paymentDate.Year, paymentDate.Month, 1)
        };
        payment.StudentAmounts.Add(new StudentAmount
        {
            Id = Guid.NewGuid(),
            CenterId = centerId,
            Amount = amount,
            TotalAmount = amount,
            PaidAmount = amount,
            RemainingAmount = 0,
            Status = PaymentStatus.FullyPaid
        });

        ctx.Payments.Add(payment);
        ctx.SaveChanges();
    }

    private void SeedIncomeOn(Guid centerId, Guid categoryId, decimal amount, DateOnly date)
    {
        using var scope = _factory.Services.CreateScope();
        var ctx = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        ctx.Incomes.Add(new Income
        {
            Id = Guid.NewGuid(),
            Name = "Boundary income",
            CategoryId = categoryId,
            Amount = amount,
            IncomeDate = date,
            CenterId = centerId
        });
        ctx.SaveChanges();
    }

    private Guid SeedExpenseCategory(Guid centerId)
    {
        using var scope = _factory.Services.CreateScope();
        var ctx = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var category = new ExpenseCategory
        {
            Id = Guid.NewGuid(),
            Name = "Boundary category",
            CenterId = centerId
        };
        ctx.ExpenseCategories.Add(category);
        ctx.SaveChanges();
        return category.Id;
    }

    private void SeedExpenseOn(Guid centerId, Guid categoryId, decimal amount, DateOnly date)
    {
        using var scope = _factory.Services.CreateScope();
        var ctx = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        ctx.Expenses.Add(new Expense
        {
            Id = Guid.NewGuid(),
            Name = "Boundary expense",
            CategoryId = categoryId,
            Amount = amount,
            ExpenseDate = date,
            CenterId = centerId
        });
        ctx.SaveChanges();
    }

    private void SeedAssistantPayment(Guid centerId, Guid assistantId, int year, int month, decimal net)
    {
        using var scope = _factory.Services.CreateScope();
        var ctx = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        ctx.AssistantPayments.Add(new AssistantPayment
        {
            Id = Guid.NewGuid(),
            AssistantId = assistantId,
            CenterId = centerId,
            Year = year,
            Month = month,
            BasicSalary = net,
            NetSalary = net,
            IsPaid = true,
            PaidAt = new DateTime(year, month, 1, 0, 0, 0, DateTimeKind.Utc)
        });
        ctx.SaveChanges();
    }
}

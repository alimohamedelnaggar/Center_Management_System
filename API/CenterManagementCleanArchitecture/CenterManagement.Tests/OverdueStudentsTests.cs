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
using CenterManagement.Data.Entities.Users;
using CenterManagement.Data.Enums;
using CenterManagement.Infrustructure.Data;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;

namespace CenterManagement.Tests;

/// <summary>
/// Covers the PART 2 "overdue students" feature:
/// <list type="bullet">
/// <item>only monthly students who still owe for the month are returned;</item>
/// <item>fully paid students are excluded, partial ones show the remaining;</item>
/// <item>students who joined after the billed month are excluded;</item>
/// <item>teacher / assistant scoping and center isolation;</item>
/// <item>teacher filter and whole-set totals independent of the page.</item>
/// </list>
/// </summary>
public sealed class OverdueStudentsTests : IClassFixture<ScopeApiFactory>
{
    private const string Url = "Api/V1/Payments/overdue-students";

    private readonly ScopeApiFactory _factory;
    private readonly SeedResult _seed;

    public OverdueStudentsTests(ScopeApiFactory factory)
    {
        _factory = factory;
        _seed = _factory.EnsureSeeded();
    }

    // ============================================================
    // Core rules
    // ============================================================

    [Fact]
    public async Task Overdue_Returns_Monthly_Students_With_Outstanding_Balance()
    {
        SeedMonthlyStudent(_seed.CenterA, _seed.GroupA, "ODA_NoPay", new DateTime(2026, 8, 1));

        var partial = SeedMonthlyStudent(_seed.CenterA, _seed.GroupA, "ODA_Partial", new DateTime(2026, 8, 1));
        SeedMonthlyPayment(_seed.CenterA, _seed.GroupA, partial, total: 100, paid: 40, PaymentStatus.PartialPaid);

        var fullyPaid = SeedMonthlyStudent(_seed.CenterA, _seed.GroupA, "ODA_Paid", new DateTime(2026, 8, 1));
        SeedMonthlyPayment(_seed.CenterA, _seed.GroupA, fullyPaid, total: 100, paid: 100, PaymentStatus.FullyPaid);

        using var doc = await GetOverdue(SoloTeacher(), "ODA_");
        var data = doc.RootElement.GetProperty("data").EnumerateArray().ToList();

        Assert.Equal(2, doc.RootElement.GetProperty("totalCount").GetInt32());

        var names = data.Select(x => x.GetProperty("studentName").GetString()).ToHashSet();
        Assert.Contains("ODA_NoPay", names);
        Assert.Contains("ODA_Partial", names);
        Assert.DoesNotContain("ODA_Paid", names);

        var noPay = data.First(x => x.GetProperty("studentName").GetString() == "ODA_NoPay");
        Assert.Equal(0, noPay.GetProperty("paidAmount").GetDecimal());
        Assert.Equal(100, noPay.GetProperty("remainingAmount").GetDecimal());
        Assert.Equal(0, noPay.GetProperty("status").GetInt32()); // NotPaid

        var partialRow = data.First(x => x.GetProperty("studentName").GetString() == "ODA_Partial");
        Assert.Equal(40, partialRow.GetProperty("paidAmount").GetDecimal());
        Assert.Equal(60, partialRow.GetProperty("remainingAmount").GetDecimal());
        Assert.Equal(1, partialRow.GetProperty("status").GetInt32()); // PartialPaid

        var meta = doc.RootElement.GetProperty("meta");
        Assert.Equal(2, meta.GetProperty("totalStudents").GetInt32());
        Assert.Equal(200, meta.GetProperty("totalDue").GetDecimal());
        Assert.Equal(40, meta.GetProperty("totalPaid").GetDecimal());
        Assert.Equal(160, meta.GetProperty("totalRemaining").GetDecimal());
    }

    [Fact]
    public async Task Overdue_Excludes_Students_Who_Joined_After_The_Billing_Period()
    {
        SeedMonthlyStudent(_seed.CenterA, _seed.GroupA, "ODB_LateJoin", new DateTime(2026, 10, 5));

        // August: the student had not joined yet -> nothing due.
        using (var august = await GetOverdue(SoloTeacher(), "ODB_"))
        {
            Assert.Equal(0, august.RootElement.GetProperty("totalCount").GetInt32());
        }

        // October: the student has joined and has not paid -> overdue.
        using var october = await GetOverdue(SoloTeacher(), "ODB_", year: 2026, month: 10);

        Assert.Equal(1, october.RootElement.GetProperty("totalCount").GetInt32());
    }

    // ============================================================
    // Scoping
    // ============================================================

    [Fact]
    public async Task Teacher_Only_Sees_His_Own_Groups_Overdue()
    {
        SeedMonthlyStudent(_seed.CenterA, _seed.GroupA, "ODC_KidA", new DateTime(2026, 8, 1));
        SeedMonthlyStudent(_seed.CenterA, _seed.GroupB, "ODC_KidB", new DateTime(2026, 8, 1));

        // Teacher A: only Group A.
        using (var asTeacher = await GetOverdue(
            Client(_seed.TeacherA, AppRoles.Teacher, _seed.CenterA), "ODC_"))
        {
            var names = Names(asTeacher);
            Assert.Contains("ODC_KidA", names);
            Assert.DoesNotContain("ODC_KidB", names);
        }

        // Center-wide (solo teacher = admin): both groups.
        using var asAdmin = await GetOverdue(SoloTeacher(), "ODC_");
        var adminNames = Names(asAdmin);
        Assert.Contains("ODC_KidA", adminNames);
        Assert.Contains("ODC_KidB", adminNames);
    }

    [Fact]
    public async Task Assistant_Sees_Only_His_Linked_Teachers_Groups()
    {
        SeedMonthlyStudent(_seed.CenterA, _seed.GroupA, "ODG_KidA", new DateTime(2026, 8, 1));
        SeedMonthlyStudent(_seed.CenterA, _seed.GroupB, "ODG_KidB", new DateTime(2026, 8, 1));

        using var doc = await GetOverdue(
            Client(_seed.AssistantA, AppRoles.Assistant, _seed.CenterA), "ODG_");

        var names = Names(doc);
        Assert.Contains("ODG_KidA", names);
        Assert.DoesNotContain("ODG_KidB", names);
    }

    [Fact]
    public async Task Overdue_Is_Isolated_Between_Centers()
    {
        SeedCenterBMonthlyStudent("ODD_KidB");

        // Center A user must not see Center B's overdue student.
        using (var fromCenterA = await GetOverdue(
            Client(_seed.TeacherA, AppRoles.Teacher, _seed.CenterA), "ODD_"))
        {
            Assert.Equal(0, fromCenterA.RootElement.GetProperty("totalCount").GetInt32());
        }

        // Center B owner sees it.
        var centerBOwner = SeedCenterBOwner();
        using var fromCenterB = await GetOverdue(
            Client(centerBOwner, AppRoles.CenterOwner, _seed.CenterB), "ODD_");

        Assert.Equal(1, fromCenterB.RootElement.GetProperty("totalCount").GetInt32());
        Assert.Contains("ODD_KidB", Names(fromCenterB));
    }

    [Fact]
    public async Task TeacherId_Filter_Narrows_To_That_Teachers_Groups()
    {
        SeedMonthlyStudent(_seed.CenterA, _seed.GroupA, "ODE_KidA", new DateTime(2026, 8, 1));
        SeedMonthlyStudent(_seed.CenterA, _seed.GroupB, "ODE_KidB", new DateTime(2026, 8, 1));

        var query =
            $"{Url}?search=ODE_&billingPeriod=2026-08-01&teacherId={_seed.TeacherB}";

        using var response = await SoloTeacher().GetAsync(query);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var names = Names(doc);
        Assert.Contains("ODE_KidB", names);
        Assert.DoesNotContain("ODE_KidA", names);
    }

    // ============================================================
    // Pagination + totals
    // ============================================================

    [Fact]
    public async Task Overdue_Totals_Are_For_The_Whole_Filtered_Set_Not_Just_The_Page()
    {
        SeedMonthlyStudent(_seed.CenterA, _seed.GroupA, "ODF_1", new DateTime(2026, 8, 1));
        SeedMonthlyStudent(_seed.CenterA, _seed.GroupA, "ODF_2", new DateTime(2026, 8, 1));
        SeedMonthlyStudent(_seed.CenterA, _seed.GroupA, "ODF_3", new DateTime(2026, 8, 1));

        var query = $"{Url}?search=ODF_&billingPeriod=2026-08-01&pageNumber=1&pageSize=1";

        using var response = await SoloTeacher().GetAsync(query);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());

        Assert.Single(doc.RootElement.GetProperty("data").EnumerateArray());
        Assert.Equal(3, doc.RootElement.GetProperty("totalCount").GetInt32());

        var meta = doc.RootElement.GetProperty("meta");
        Assert.Equal(3, meta.GetProperty("totalStudents").GetInt32());
        Assert.Equal(300, meta.GetProperty("totalRemaining").GetDecimal());
    }

    // ============================================================
    // Student enrolled in two groups -> one row per (student, group)
    // ============================================================

    [Fact]
    public async Task Overdue_Two_Groups_Student_Pays_One_Group_Only_Shows_The_Other()
    {
        var studentId = SeedMonthlyStudentInTwoGroups(
            _seed.CenterA,
            _seed.GroupA,
            _seed.GroupB,
            "ODH_TwoGroups",
            new DateTime(2026, 8, 1));

        // Paid Group A in full, nothing for Group B.
        SeedMonthlyPayment(_seed.CenterA, _seed.GroupA, studentId, total: 100, paid: 100, PaymentStatus.FullyPaid);

        using var doc = await GetOverdue(SoloTeacher(), "ODH_");
        var data = doc.RootElement.GetProperty("data").EnumerateArray().ToList();

        // Exactly one row - for the unpaid group only.
        Assert.Single(data);

        var row = data[0];
        Assert.Equal("ODH_TwoGroups", row.GetProperty("studentName").GetString());
        Assert.Equal(_seed.GroupB, row.GetProperty("groupId").GetGuid());
        Assert.Equal(100, row.GetProperty("totalAmount").GetDecimal());
        Assert.Equal(0, row.GetProperty("paidAmount").GetDecimal());
        Assert.Equal(100, row.GetProperty("remainingAmount").GetDecimal());
        Assert.Equal(0, row.GetProperty("status").GetInt32()); // NotPaid

        var meta = doc.RootElement.GetProperty("meta");
        Assert.Equal(1, meta.GetProperty("totalStudents").GetInt32());
        Assert.Equal(100, meta.GetProperty("totalDue").GetDecimal());
        Assert.Equal(0, meta.GetProperty("totalPaid").GetDecimal());
        Assert.Equal(100, meta.GetProperty("totalRemaining").GetDecimal());

        // Group filter works per row.
        using (var onlyB = await GetOverdueByGroup(SoloTeacher(), "ODH_", _seed.GroupB))
        {
            Assert.Equal(1, onlyB.RootElement.GetProperty("totalCount").GetInt32());
        }

        using (var onlyA = await GetOverdueByGroup(SoloTeacher(), "ODH_", _seed.GroupA))
        {
            Assert.Equal(0, onlyA.RootElement.GetProperty("totalCount").GetInt32());
        }
    }

    [Fact]
    public async Task Overdue_Two_Groups_Student_Who_Paid_Both_Does_Not_Appear()
    {
        var studentId = SeedMonthlyStudentInTwoGroups(
            _seed.CenterA,
            _seed.GroupA,
            _seed.GroupB,
            "ODI_TwoGroupsPaid",
            new DateTime(2026, 8, 1));

        SeedMonthlyPayment(_seed.CenterA, _seed.GroupA, studentId, total: 100, paid: 100, PaymentStatus.FullyPaid);
        SeedMonthlyPayment(_seed.CenterA, _seed.GroupB, studentId, total: 100, paid: 100, PaymentStatus.FullyPaid);

        using var doc = await GetOverdue(SoloTeacher(), "ODI_");

        Assert.Equal(0, doc.RootElement.GetProperty("totalCount").GetInt32());
        Assert.Equal(0, doc.RootElement.GetProperty("meta").GetProperty("totalStudents").GetInt32());
    }

    // ============================================================
    // Helpers
    // ============================================================

    private static HashSet<string?> Names(JsonDocument doc) =>
        doc.RootElement
            .GetProperty("data")
            .EnumerateArray()
            .Select(x => x.GetProperty("studentName").GetString())
            .ToHashSet();

    private async Task<JsonDocument> GetOverdue(
        HttpClient client,
        string search,
        int year = 2026,
        int month = 8)
    {
        var query = $"{Url}?search={search}&billingPeriod={year}-{month:D2}-01";

        var response = await client.GetAsync(query);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        return JsonDocument.Parse(await response.Content.ReadAsStringAsync());
    }

    private async Task<JsonDocument> GetOverdueByGroup(
        HttpClient client,
        string search,
        Guid groupId,
        int year = 2026,
        int month = 8)
    {
        var query =
            $"{Url}?search={search}&billingPeriod={year}-{month:D2}-01&groupId={groupId}";

        var response = await client.GetAsync(query);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        return JsonDocument.Parse(await response.Content.ReadAsStringAsync());
    }

    private Guid SeedMonthlyStudentInTwoGroups(
        Guid centerId,
        Guid groupA,
        Guid groupB,
        string name,
        DateTime joinDate)
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
            GroupId = groupA,
            CenterId = centerId,
            IsActive = true,
            JoinDate = joinDate
        });

        ctx.StudentGroups.Add(new StudentGroup
        {
            StudentId = student.Id,
            GroupId = groupB,
            CenterId = centerId,
            IsActive = true,
            JoinDate = joinDate
        });

        ctx.SaveChanges();
        return student.Id;
    }

    private Guid SeedMonthlyStudent(
        Guid centerId,
        Guid groupId,
        string name,
        DateTime joinDate,
        SubscriptionType type = SubscriptionType.Month)
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
            SubscriptionType = type
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

    private void SeedMonthlyPayment(
        Guid centerId,
        Guid groupId,
        Guid studentId,
        decimal total,
        decimal paid,
        PaymentStatus status)
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

    private void SeedCenterBMonthlyStudent(string name)
    {
        using var scope = _factory.Services.CreateScope();
        var ctx = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var group = new Group
        {
            Id = Guid.NewGuid(),
            Name = "Center B Overdue Group",
            CenterId = _seed.CenterB,
            MonthlyPrice = 100,
            SessionsPerMonth = 8
        };
        var student = new Student
        {
            Id = Guid.NewGuid(),
            FullName = name,
            PhoneNumber = "01230000099",
            ParentPhoneNumber = "01230000098",
            CenterId = _seed.CenterB,
            SubscriptionType = SubscriptionType.Month
        };

        ctx.Groups.Add(group);
        ctx.Students.Add(student);
        ctx.StudentGroups.Add(new StudentGroup
        {
            StudentId = student.Id,
            GroupId = group.Id,
            CenterId = _seed.CenterB,
            IsActive = true,
            JoinDate = new DateTime(2026, 8, 1)
        });
        ctx.SaveChanges();
    }

    private Guid SeedCenterBOwner()
    {
        using var scope = _factory.Services.CreateScope();
        var ctx = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var owner = new User
        {
            Id = Guid.NewGuid(),
            FullName = "Center B Owner",
            PhoneNumber = "01000000077",
            CenterId = _seed.CenterB
        };
        ctx.Users.Add(owner);
        ctx.SaveChanges();
        return owner.Id;
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
            new AuthenticationHeaderValue(
                "Bearer",
                CreateToken(userId, role, centerId, isCenterAdmin));

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
}

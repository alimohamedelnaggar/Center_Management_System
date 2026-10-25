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
using CenterManagement.Data.Entities.Users;
using CenterManagement.Infrustructure.Data;
using CenterManagement.Infrustructure.Services;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;

namespace CenterManagement.Tests;

/// <summary>
/// Covers the PART 1 payment receipt feature:
/// <list type="bullet">
/// <item>the endpoint returns a receipt number and never a GUID;</item>
/// <item>legacy payments without a number are surfaced as null (UI shows "-");</item>
/// <item>center isolation and teacher isolation;</item>
/// <item>the per-center counter allocates unique, consecutive numbers under
/// concurrency and rolls back with the surrounding transaction.</item>
/// </list>
/// </summary>
public sealed class PaymentReceiptTests : IClassFixture<ScopeApiFactory>
{
    private readonly ScopeApiFactory _factory;
    private readonly SeedResult _seed;

    public PaymentReceiptTests(ScopeApiFactory factory)
    {
        _factory = factory;
        _seed = _factory.EnsureSeeded();
    }

    // ============================================================
    // HTTP endpoint
    // ============================================================

    [Fact]
    public async Task Payment_Created_Via_Api_Gets_Receipt_Number_And_Receipt_Endpoint_Returns_It()
    {
        // Arrange: a dedicated group with Student A enrolled.
        var create = await Client(_seed.SoloTeacherA, AppRoles.Teacher, _seed.CenterA, isCenterAdmin: true)
            .PostAsync("Api/V1/Group/Create", Json(new
            {
                name = "Receipt Api Group",
                monthlyPrice = 400,
                perSessionPrice = 40,
                sessionsPerMonth = 8,
                teacherId = _seed.SoloTeacherA,
                schedule = new[]
                {
                    new { dayIndex = 0, startTime = "09:00", endTime = "10:30" }
                }
            }));
        Assert.Equal(HttpStatusCode.OK, create.StatusCode);

        Guid groupId;
        Guid studentId;
        using (var scope = _factory.Services.CreateScope())
        {
            var ctx = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            groupId = await ctx.Groups.Where(g => g.Name == "Receipt Api Group").Select(g => g.Id).FirstAsync();

            // A dedicated student so this test never collides with the monthly
            // payments other tests seed for the shared Student A.
            var student = new Student
            {
                Id = Guid.NewGuid(),
                FullName = "Receipt Student",
                PhoneNumber = "01200000055",
                ParentPhoneNumber = "01200000056",
                CenterId = _seed.CenterA
            };
            ctx.Students.Add(student);
            ctx.StudentGroups.Add(new StudentGroup
            {
                StudentId = student.Id,
                GroupId = groupId,
                CenterId = _seed.CenterA,
                IsActive = true,
                JoinDate = new DateTime(2026, 8, 1)
            });
            await ctx.SaveChangesAsync();
            studentId = student.Id;
        }

        // Act: create the payment (center A's first recorded payment).
        var paymentResponse = await Client(_seed.SoloTeacherA, AppRoles.Teacher, _seed.CenterA, isCenterAdmin: true)
            .PostAsync("Api/V1/Payments/Create", Json(new
            {
                studentId,
                groupId,
                billingPeriod = "2026-08-01",
                amount = 100
            }));
        var createBody = await paymentResponse.Content.ReadAsStringAsync();
        Assert.True(paymentResponse.StatusCode == HttpStatusCode.OK, $"Body: {createBody}");

        Guid paymentId;
        int? storedNumber;
        using (var scope = _factory.Services.CreateScope())
        {
            var ctx = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var payment = await ctx.Payments.FirstAsync(p => p.GroupId == groupId);
            paymentId = payment.Id;
            storedNumber = payment.ReceiptNumber;
        }

        Assert.NotNull(storedNumber);

        // Act: fetch the receipt.
        var response = await Client(_seed.SoloTeacherA, AppRoles.Teacher, _seed.CenterA, isCenterAdmin: true)
            .GetAsync($"Api/V1/Payments/{paymentId}/receipt");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var data = doc.RootElement.GetProperty("data");

        Assert.Equal(storedNumber, data.GetProperty("receiptNumber").GetInt32());
        Assert.Equal("Receipt Student", data.GetProperty("studentName").GetString());
        Assert.Equal("Receipt Api Group", data.GetProperty("groupName").GetString());
        Assert.Equal("Center A", data.GetProperty("centerName").GetString());
        Assert.Equal("Solo Teacher A", data.GetProperty("receivedByName").GetString());

        // The receipt must never expose a GUID as the human-readable number.
        Assert.Equal(JsonValueKind.Number, data.GetProperty("receiptNumber").ValueKind);
    }

    [Fact]
    public async Task Receipt_For_Legacy_Payment_Without_Number_Returns_Null()
    {
        var paymentId = SeedPayment(_seed.CenterA, _seed.GroupA, _seed.StudentA, receiptNumber: null);

        var response = await Client(_seed.TeacherA, AppRoles.Teacher, _seed.CenterA)
            .GetAsync($"Api/V1/Payments/{paymentId}/receipt");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var data = doc.RootElement.GetProperty("data");

        Assert.Equal(JsonValueKind.Null, data.GetProperty("receiptNumber").ValueKind);
    }

    [Fact]
    public async Task Teacher_Cannot_Read_Another_Teachers_Receipt()
    {
        // Payment belongs to Group B (Teacher B's group).
        var paymentId = SeedPayment(_seed.CenterA, _seed.GroupB, _seed.StudentB, receiptNumber: 7);

        var response = await Client(_seed.TeacherA, AppRoles.Teacher, _seed.CenterA)
            .GetAsync($"Api/V1/Payments/{paymentId}/receipt");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Teacher_Can_Read_His_Own_Receipt()
    {
        var paymentId = SeedPayment(_seed.CenterA, _seed.GroupA, _seed.StudentA, receiptNumber: 11);

        var response = await Client(_seed.TeacherA, AppRoles.Teacher, _seed.CenterA)
            .GetAsync($"Api/V1/Payments/{paymentId}/receipt");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task Receipt_Is_Isolated_Between_Centers()
    {
        // A payment that lives in Center B.
        var centerBPaymentId = SeedCenterBPayment(receiptNumber: 5);

        // A Center A user must not be able to read it (tenant filter -> 404).
        var fromCenterA = await Client(_seed.TeacherA, AppRoles.Teacher, _seed.CenterA)
            .GetAsync($"Api/V1/Payments/{centerBPaymentId}/receipt");
        Assert.Equal(HttpStatusCode.NotFound, fromCenterA.StatusCode);

        // A Center B owner can read it (proves it really exists and is reachable).
        var centerBOwner = SeedCenterBOwner();
        var fromCenterB = await Client(centerBOwner, AppRoles.CenterOwner, _seed.CenterB)
            .GetAsync($"Api/V1/Payments/{centerBPaymentId}/receipt");
        Assert.Equal(HttpStatusCode.OK, fromCenterB.StatusCode);
    }

    // ============================================================
    // Counter: direct service tests (real SQLite, no HTTP)
    // ============================================================

    [Fact]
    public async Task Counter_First_Allocation_Starts_At_One_Then_Increments()
    {
        var path = TempDbPath();
        try
        {
            var options = BuildOptions(path);
            using (var ctx = new AppDbContext(options, new TestTenantContext { IsUnrestricted = true }))
            {
                ctx.Database.EnsureCreated();
            }

            var centerId = Guid.NewGuid();

            await using (var ctx1 = new AppDbContext(options, new TestTenantContext { IsUnrestricted = true }))
            {
                var service = new ReceiptNumberService(ctx1);
                Assert.Equal(1, await service.NextAsync(centerId));
            }

            await using (var ctx2 = new AppDbContext(options, new TestTenantContext { IsUnrestricted = true }))
            {
                var service = new ReceiptNumberService(ctx2);
                Assert.Equal(2, await service.NextAsync(centerId));
            }
        }
        finally
        {
            Cleanup(path);
        }
    }

    [Fact]
    public async Task Counter_Twenty_Parallel_Allocations_Are_Unique_And_Consecutive()
    {
        var path = TempDbPath();
        try
        {
            var options = BuildOptions(path);
            var centerId = Guid.NewGuid();

            using (var ctx = new AppDbContext(options, new TestTenantContext { IsUnrestricted = true }))
            {
                ctx.Database.EnsureCreated();
                ctx.CenterReceiptCounters.Add(new CenterReceiptCounter { CenterId = centerId, LastNumber = 0 });
                ctx.SaveChanges();
            }

            var tasks = Enumerable.Range(0, 20).Select(_ => Task.Run(async () =>
            {
                await using var ctx = new AppDbContext(options, new TestTenantContext { IsUnrestricted = true });
                var service = new ReceiptNumberService(ctx);
                return await service.NextAsync(centerId);
            }));

            var numbers = await Task.WhenAll(tasks);

            Assert.Equal(20, numbers.Distinct().Count());
            Assert.Equal(Enumerable.Range(1, 20), numbers.OrderBy(n => n));

            await using var verify = new AppDbContext(options, new TestTenantContext { IsUnrestricted = true });
            var counter = await verify.CenterReceiptCounters.FirstAsync(c => c.CenterId == centerId);
            Assert.Equal(20, counter.LastNumber);
        }
        finally
        {
            Cleanup(path);
        }
    }

    [Fact]
    public async Task Counter_Rolls_Back_With_The_Ambient_Transaction()
    {
        var path = TempDbPath();
        try
        {
            var options = BuildOptions(path);
            var centerId = Guid.NewGuid();

            using (var seedCtx = new AppDbContext(options, new TestTenantContext { IsUnrestricted = true }))
            {
                seedCtx.Database.EnsureCreated();
                seedCtx.CenterReceiptCounters.Add(new CenterReceiptCounter { CenterId = centerId, LastNumber = 0 });
                seedCtx.SaveChanges();
            }

            await using (var ctx = new AppDbContext(options, new TestTenantContext { IsUnrestricted = true }))
            {
                await using var tx = await ctx.Database.BeginTransactionAsync();

                var service = new ReceiptNumberService(ctx);
                var number = await service.NextAsync(centerId);
                Assert.Equal(1, number);

                // Simulate the payment insert failing: the whole unit rolls back.
                await tx.RollbackAsync();
            }

            await using var verify = new AppDbContext(options, new TestTenantContext { IsUnrestricted = true });
            var counter = await verify.CenterReceiptCounters.FirstAsync(c => c.CenterId == centerId);
            Assert.Equal(0, counter.LastNumber);
        }
        finally
        {
            Cleanup(path);
        }
    }

    // ============================================================
    // Helpers
    // ============================================================

    private Guid SeedPayment(Guid centerId, Guid groupId, Guid studentId, int? receiptNumber)
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
            BillingPeriod = new DateOnly(2026, 8, 1),
            ReceiptNumber = receiptNumber,
            ReceivedBy = _seed.TeacherA,
            ReceivedByName = "Teacher A"
        };
        payment.StudentAmounts.Add(new StudentAmount
        {
            Id = Guid.NewGuid(),
            CenterId = centerId,
            Amount = 100,
            TotalAmount = 100,
            PaidAmount = 100,
            RemainingAmount = 0,
            Status = CenterManagement.Data.Enums.PaymentStatus.FullyPaid
        });

        ctx.Payments.Add(payment);
        ctx.SaveChanges();
        return payment.Id;
    }

    private Guid SeedCenterBPayment(int? receiptNumber)
    {
        using var scope = _factory.Services.CreateScope();
        var ctx = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var group = new Group { Id = Guid.NewGuid(), Name = "Group B2", CenterId = _seed.CenterB, MonthlyPrice = 100 };
        var student = new Student
        {
            Id = Guid.NewGuid(),
            FullName = "Center B Student",
            PhoneNumber = "01200000099",
            ParentPhoneNumber = "01200000098",
            CenterId = _seed.CenterB
        };
        ctx.Groups.Add(group);
        ctx.Students.Add(student);
        ctx.SaveChanges();

        var payment = new Payment
        {
            Id = Guid.NewGuid(),
            CenterId = _seed.CenterB,
            GroupId = group.Id,
            StudentId = student.Id,
            PaymentDate = new DateTime(2026, 8, 15, 10, 0, 0),
            ReceivedAt = new DateTime(2026, 8, 15, 8, 0, 0, DateTimeKind.Utc),
            ReceiptNumber = receiptNumber
        };
        ctx.Payments.Add(payment);
        ctx.SaveChanges();
        return payment.Id;
    }

    private Guid SeedCenterBOwner()
    {
        using var scope = _factory.Services.CreateScope();
        var ctx = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var owner = new CenterManagement.Data.Entities.Identity.User
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

    private static string TempDbPath() =>
        Path.Combine(Path.GetTempPath(), $"receipt_counter_{Guid.NewGuid():N}.db");

    private static DbContextOptions<AppDbContext> BuildOptions(string path) =>
        new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlite($"DataSource={path};Default Timeout=30")
            .Options;

    private static void Cleanup(string path)
    {
        try
        {
            if (File.Exists(path))
                File.Delete(path);
        }
        catch (IOException)
        {
        }
    }

    private static StringContent Json(object value) =>
        new(JsonSerializer.Serialize(value), Encoding.UTF8, "application/json");

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

using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Text;
using CenterManagement.Core.Features.Platform.Queries.Models;
using CenterManagement.Core.Features.Subscriptions.Commands.Models;
using CenterManagement.Core.Features.Subscriptions.Queries.Models;
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
/// STEP 4 acceptance: the SuperAdmin subscription screen is super-admin only,
/// renewal resumes from the original end date and reactivates the center, module
/// edits auto-enable prerequisites / warn on blocked disables, and the module cache
/// is invalidated immediately.
/// </summary>
public sealed class CenterSubscriptionManagementTests : IClassFixture<ScopeApiFactory>
{
    private readonly ScopeApiFactory _factory;
    private readonly SeedResult _seed;

    public CenterSubscriptionManagementTests(ScopeApiFactory factory)
    {
        _factory = factory;
        _seed = _factory.EnsureSeeded();
    }

    // ---------------- A) SuperAdmin-only ----------------

    [Fact]
    public async Task Teacher_Cannot_Read_Or_Write_Subscriptions()
    {
        var teacher = Client(AppRoles.Teacher, _seed.TeacherA, _seed.CenterA);

        var list = await teacher.GetAsync("Api/V1/Center/Subscriptions");
        var update = await teacher.PutAsJsonAsync("Api/V1/Center/Modules/Update", new
        {
            centerId = _seed.CenterA,
            enabledModules = ModuleKeys.All
        });

        Assert.Equal(HttpStatusCode.Forbidden, list.StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, update.StatusCode);
    }

    [Fact]
    public async Task CenterOwner_Cannot_Read_Subscriptions()
    {
        var owner = Client(AppRoles.CenterOwner, _seed.CenterOwnerA, _seed.CenterA);

        var list = await owner.GetAsync("Api/V1/Center/Subscriptions");

        Assert.Equal(HttpStatusCode.Forbidden, list.StatusCode);
    }

    [Theory]
    [InlineData(AppRoles.CenterOwner)]
    [InlineData(AppRoles.Teacher)]
    [InlineData(AppRoles.Assistant)]
    public async Task NonPlatform_Roles_Get_403_On_Every_Subscription_Endpoint(string role)
    {
        var centerId = _seed.CenterA;
        var client = Client(role, _seed.TeacherA, centerId);

        var checks = new List<(string Method, string Url)>
        {
            ("GET", "Api/V1/Center/Subscriptions"),
            ("GET", $"Api/V1/Center/{centerId}/Subscription"),
            ("GET", $"Api/V1/Center/{centerId}/Subscription/History"),
            ("PUT", "Api/V1/Center/Subscription/Update"),
            ("POST", $"Api/V1/Center/{centerId}/Subscription/Renew"),
            ("POST", "Api/V1/Center/Subscription/Payment"),
            ("PUT", "Api/V1/Center/Modules/Update"),
            ("GET", $"Api/V1/Center/Modules/Preview?centerId={centerId}")
        };

        foreach (var (method, url) in checks)
        {
            HttpResponseMessage response = method switch
            {
                "GET" => await client.GetAsync(url),
                "PUT" => await client.PutAsJsonAsync(url, new { centerId, enabledModules = Array.Empty<string>() }),
                _ => await client.PostAsJsonAsync(url, new { centerId, amount = 1 })
            };

            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        }
    }

    [Fact]
    public async Task SuperAdmin_Can_Read_Subscriptions_And_Detail()
    {
        var admin = Client(AppRoles.SuperAdmin, Guid.NewGuid(), _seed.CenterA);

        var list = await admin.GetAsync("Api/V1/Center/Subscriptions");
        Assert.Equal(HttpStatusCode.OK, list.StatusCode);

        var payload = await list.Content.ReadFromJsonAsync<JsonEnvelope<List<CenterSubscriptionListItemDto>>>();
        Assert.NotNull(payload);
        Assert.True(payload!.Succeeded);
        Assert.Contains(payload.Data!, item => item.Id == _seed.CenterA);

        var detail = await admin.GetAsync($"Api/V1/Center/{_seed.CenterA}/Subscription");
        Assert.Equal(HttpStatusCode.OK, detail.StatusCode);

        var detailPayload = await detail.Content.ReadFromJsonAsync<JsonEnvelope<CenterSubscriptionDetailDto>>();
        Assert.NotNull(detailPayload?.Data);
        Assert.Equal(ModuleKeys.All.Length, detailPayload!.Data!.Modules.Count);
        Assert.Equal(3, detailPayload.Data.Presets.Count);
    }

    // ---------------- B) renewal rules ----------------

    [Fact]
    public async Task Renewal_Of_Grace_Center_Resumes_From_Original_End_And_Reactivates()
    {
        var (centerId, _) = CreateCenterWithAllModules();

        var originalEnd = DateTime.UtcNow.Date.AddDays(-2);
        SetSubscription(centerId, originalEnd.AddYears(-1), originalEnd, graceDays: 3, CenterStatus.Active);

        using var scope = _factory.Services.CreateScope();
        var mediator = scope.ServiceProvider.GetRequiredService<IMediator>();

        var result = await mediator.Send(new RenewCenterSubscriptionCommand
        {
            CenterId = centerId,
            Type = SubscriptionPlanType.Annual,
            Price = 1200,
            PaidAmount = 1200
        });

        Assert.True(result.Succeeded, result.Message);
        Assert.Equal(originalEnd.Date, result.Data!.SubscriptionStart!.Value.Date);
        Assert.Equal(originalEnd.AddMonths(12).Date, result.Data.SubscriptionEnd!.Value.Date);
        Assert.Equal(nameof(CenterStatus.Active), result.Data.Status);
        Assert.Equal("Active", result.Data.State);
    }

    [Fact]
    public async Task Renewal_Of_Active_Center_Stacks_From_Current_End()
    {
        var (centerId, _) = CreateCenterWithAllModules();

        var futureEnd = DateTime.UtcNow.Date.AddMonths(2);
        SetSubscription(centerId, DateTime.UtcNow.Date.AddMonths(-10), futureEnd, graceDays: 0, CenterStatus.Active);

        using var scope = _factory.Services.CreateScope();
        var mediator = scope.ServiceProvider.GetRequiredService<IMediator>();

        var result = await mediator.Send(new RenewCenterSubscriptionCommand
        {
            CenterId = centerId,
            Type = SubscriptionPlanType.Annual
        });

        Assert.True(result.Succeeded, result.Message);
        Assert.Equal(futureEnd, result.Data!.SubscriptionStart!.Value.Date);
        Assert.Equal(futureEnd.AddMonths(12), result.Data.SubscriptionEnd!.Value.Date);
    }

    [Fact]
    public async Task Renewal_After_Grace_Starts_From_Today_And_Reactivates()
    {
        var (centerId, _) = CreateCenterWithAllModules();

        var originalEnd = DateTime.UtcNow.Date.AddDays(-10);
        SetSubscription(centerId, originalEnd.AddYears(-1), originalEnd, graceDays: 3, CenterStatus.Expired);

        using var scope = _factory.Services.CreateScope();
        var mediator = scope.ServiceProvider.GetRequiredService<IMediator>();

        var result = await mediator.Send(new RenewCenterSubscriptionCommand
        {
            CenterId = centerId,
            Type = SubscriptionPlanType.Annual
        });

        Assert.True(result.Succeeded, result.Message);
        Assert.Equal(DateTime.UtcNow.Date, result.Data!.SubscriptionStart!.Value.Date);
        Assert.Equal(DateTime.UtcNow.Date.AddMonths(12), result.Data.SubscriptionEnd!.Value.Date);
        Assert.Equal(nameof(CenterStatus.Active), result.Data.Status);
        Assert.Equal("Active", result.Data.State);
    }

    [Fact]
    public async Task Renewal_Keeps_A_Suspended_Center_Suspended()
    {
        var (centerId, _) = CreateCenterWithAllModules();

        var originalEnd = DateTime.UtcNow.Date.AddDays(-1);
        SetSubscription(centerId, originalEnd.AddYears(-1), originalEnd, graceDays: 3, CenterStatus.Suspended);

        using var scope = _factory.Services.CreateScope();
        var mediator = scope.ServiceProvider.GetRequiredService<IMediator>();

        var result = await mediator.Send(new RenewCenterSubscriptionCommand
        {
            CenterId = centerId,
            Type = SubscriptionPlanType.Annual
        });

        Assert.True(result.Succeeded, result.Message);
        Assert.Equal(nameof(CenterStatus.Suspended), result.Data!.Status);
        Assert.Equal("Suspended", result.Data.State);
    }

    // ---------------- C) immediate cache invalidation ----------------

    [Fact]
    public async Task Disabling_A_Module_Takes_Effect_Immediately_On_Next_Request()
    {
        var (centerId, userId) = CreateCenterWithAllModules();
        var client = Client(AppRoles.Teacher, userId, centerId);

        // First call populates the (45s) module cache with attendance enabled.
        var before = await client.GetAsync("Api/V1/Attendance/stats");
        Assert.Equal(HttpStatusCode.OK, before.StatusCode);

        using (var scope = _factory.Services.CreateScope())
        {
            var mediator = scope.ServiceProvider.GetRequiredService<IMediator>();

            var update = await mediator.Send(new UpdateCenterModulesCommand
            {
                CenterId = centerId,
                EnabledModules = ModuleKeys.All.Where(key => key != ModuleKeys.Attendance).ToList(),
                DisableDependents = true
            });

            Assert.True(update.Succeeded, update.Message);
        }

        // Without immediate invalidation the cached "enabled" set would still be
        // returned for up to 45s; the very next request must already be blocked.
        var after = await client.GetAsync("Api/V1/Attendance/stats");
        Assert.Equal(HttpStatusCode.Forbidden, after.StatusCode);
        Assert.Contains(ModuleAccessCodes.ModuleDisabled, await after.Content.ReadAsStringAsync());
    }

    // ---------------- D) dependency preview & enforcement ----------------

    [Fact]
    public async Task Preview_AutoEnables_Missing_Prerequisites()
    {
        // A bare center (no module rows yet) asked to enable only online_exams:
        // the resolver must pull in its prerequisite question_bank automatically.
        var (centerId, _) = CreateCenter(withAllModules: false);

        using var scope = _factory.Services.CreateScope();
        var mediator = scope.ServiceProvider.GetRequiredService<IMediator>();

        var preview = await mediator.Send(new PreviewCenterModulesQuery
        {
            CenterId = centerId,
            EnabledModules = [ModuleKeys.OnlineExams]
        });

        Assert.True(preview.Succeeded, preview.Message);
        Assert.Contains(ModuleKeys.OnlineExams, preview.Data!.Enabled);
        Assert.Contains(ModuleKeys.QuestionBank, preview.Data.Enabled);
        Assert.Contains(ModuleKeys.QuestionBank, preview.Data.AutoEnabled);
    }

    [Fact]
    public async Task Disabling_A_Prerequisite_Is_Rejected_Until_Dependents_OptedOut()
    {
        var (centerId, _) = CreateCenterWithAllModules();

        var requestWithoutQuestionBank =
            ModuleKeys.All.Where(key => key != ModuleKeys.QuestionBank).ToList();

        using var scope = _factory.Services.CreateScope();
        var mediator = scope.ServiceProvider.GetRequiredService<IMediator>();

        // Blocked: online_exams still enabled depends on question_bank.
        var blocked = await mediator.Send(new UpdateCenterModulesCommand
        {
            CenterId = centerId,
            EnabledModules = requestWithoutQuestionBank,
            DisableDependents = false
        });

        Assert.False(blocked.Succeeded);

        var afterBlocked = await mediator.Send(new PreviewCenterModulesQuery
        {
            CenterId = centerId,
            EnabledModules = requestWithoutQuestionBank,
            DisableDependents = false
        });
        Assert.NotEmpty(afterBlocked.Data!.Conflicts);
        Assert.Contains(afterBlocked.Data.Conflicts,
            conflict => conflict.Module == ModuleKeys.QuestionBank);
        Assert.Contains(afterBlocked.Data.Conflicts,
            conflict => conflict.Dependents.Contains(ModuleKeys.OnlineExams));

        // Opting in disables the dependent too.
        var applied = await mediator.Send(new UpdateCenterModulesCommand
        {
            CenterId = centerId,
            EnabledModules = requestWithoutQuestionBank,
            DisableDependents = true
        });

        Assert.True(applied.Succeeded, applied.Message);
        Assert.DoesNotContain(ModuleKeys.QuestionBank, applied.Data!.Enabled);
        Assert.DoesNotContain(ModuleKeys.OnlineExams, applied.Data.Enabled);
        Assert.Contains(ModuleKeys.OnlineExams, applied.Data.ForceDisabled);
    }

    // ---------------- E) audit ----------------

    [Fact]
    public async Task Module_Change_Is_Written_To_The_Audit_Trail()
    {
        var (centerId, _) = CreateCenterWithAllModules();

        using var scope = _factory.Services.CreateScope();
        var mediator = scope.ServiceProvider.GetRequiredService<IMediator>();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var update = await mediator.Send(new UpdateCenterModulesCommand
        {
            CenterId = centerId,
            EnabledModules = [ModuleKeys.Attendance],
            DisableDependents = true
        });

        Assert.True(update.Succeeded, update.Message);

        var audited = await context.AuditLogs
            .AnyAsync(log => log.Action == "UpdateCenterModules" && log.EntityId == centerId.ToString());

        Assert.True(audited, "Expected an audit entry for the module change.");
    }

    [Fact]
    public async Task Renewal_Is_Written_To_The_Audit_Trail()
    {
        var (centerId, _) = CreateCenterWithAllModules();

        SetSubscription(
            centerId,
            DateTime.UtcNow.Date.AddMonths(-13),
            DateTime.UtcNow.Date.AddDays(-5),
            graceDays: 3,
            CenterStatus.Expired);

        using var scope = _factory.Services.CreateScope();
        var mediator = scope.ServiceProvider.GetRequiredService<IMediator>();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var renewal = await mediator.Send(new RenewCenterSubscriptionCommand
        {
            CenterId = centerId,
            Type = SubscriptionPlanType.Monthly
        });

        Assert.True(renewal.Succeeded, renewal.Message);

        var audited = await context.AuditLogs
            .AnyAsync(log => log.Action == "RenewCenterSubscription" && log.EntityId == centerId.ToString());

        Assert.True(audited, "Expected an audit entry for the renewal.");
    }

    [Fact]
    public async Task Renewal_Of_Lifetime_Center_Is_Rejected()
    {
        var (centerId, _) = CreateCenterWithAllModules();

        SetSubscription(
            centerId,
            DateTime.UtcNow.Date.AddYears(-5),
            null, // Lifetime
            graceDays: 3,
            CenterStatus.Active);

        using var scope = _factory.Services.CreateScope();
        var mediator = scope.ServiceProvider.GetRequiredService<IMediator>();

        var renewal = await mediator.Send(new RenewCenterSubscriptionCommand
        {
            CenterId = centerId,
            Type = SubscriptionPlanType.Monthly
        });

        Assert.False(renewal.Succeeded);
        Assert.Contains("مدى الحياة", renewal.Message);
    }

    // ---------------- F) history, payments & statistics ----------------

    [Fact]
    public async Task History_And_Payment_Record_Update_Balance_And_Audit()
    {
        var (centerId, _) = CreateCenterWithAllModules();

        using var scope = _factory.Services.CreateScope();
        var mediator = scope.ServiceProvider.GetRequiredService<IMediator>();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var set = await mediator.Send(new UpdateCenterSubscriptionCommand
        {
            CenterId = centerId,
            Type = SubscriptionPlanType.Annual,
            StartDate = DateTime.UtcNow.Date,
            Price = 1000,
            PaidAmount = 200,
            GraceDays = 3
        });
        Assert.True(set.Succeeded, set.Message);

        var pay = await mediator.Send(new AddCenterSubscriptionPaymentCommand
        {
            CenterId = centerId,
            Amount = 300,
            Method = "Cash"
        });

        Assert.True(pay.Succeeded, pay.Message);
        Assert.Equal(500m, pay.Data!.PaidAmount);
        Assert.Equal(500m, pay.Data.RemainingAmount);
        Assert.Single(pay.Data.Subscriptions);
        Assert.Single(pay.Data.Subscriptions[0].Payments);

        var history = await mediator.Send(new GetCenterSubscriptionHistoryQuery { CenterId = centerId });
        Assert.True(history.Succeeded);
        Assert.Equal(1000m, history.Data!.Price);
        Assert.Equal(500m, history.Data.PaidAmount);

        var audited = await context.AuditLogs
            .AnyAsync(log => log.Action == "AddCenterSubscriptionPayment" && log.EntityId == centerId.ToString());
        Assert.True(audited, "Expected an audit entry for the payment.");
    }

    [Fact]
    public async Task Payment_Is_Rejected_For_NonPositive_Amount()
    {
        var (centerId, _) = CreateCenterWithAllModules();

        using var scope = _factory.Services.CreateScope();
        var mediator = scope.ServiceProvider.GetRequiredService<IMediator>();

        var result = await mediator.Send(new AddCenterSubscriptionPaymentCommand
        {
            CenterId = centerId,
            Amount = 0
        });

        Assert.False(result.Succeeded);
    }

    [Fact]
    public async Task Platform_Statistics_Expose_Type_Grace_And_Revenue()
    {
        var (centerId, _) = CreateCenterWithAllModules();

        using (var scope = _factory.Services.CreateScope())
        {
            var mediator = scope.ServiceProvider.GetRequiredService<IMediator>();

            // A Lifetime subscription guarantees the type appears in the breakdown.
            var set = await mediator.Send(new UpdateCenterSubscriptionCommand
            {
                CenterId = centerId,
                Type = SubscriptionPlanType.Lifetime,
                StartDate = DateTime.UtcNow.Date,
                Price = 0,
                PaidAmount = 0
            });
            Assert.True(set.Succeeded, set.Message);
        }

        var admin = Client(AppRoles.SuperAdmin, Guid.NewGuid(), _seed.CenterA);

        var response = await admin.GetAsync("Api/V1/Platform/Statistics");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var payload = await response.Content.ReadFromJsonAsync<JsonEnvelope<PlatformStatisticsDto>>();
        Assert.NotNull(payload?.Data);

        Assert.Contains(payload!.Data!.SubscriptionsByType,
            item => item.Type == nameof(SubscriptionPlanType.Lifetime));
        Assert.True(payload.Data.CentersInGrace >= 0);
        Assert.Equal(12, payload.Data.RevenueByMonth.Count);
    }

    // ---------------- fixtures ----------------

    private (Guid CenterId, Guid UserId) CreateCenterWithAllModules() => CreateCenter(withAllModules: true);

    private (Guid CenterId, Guid UserId) CreateCenter(bool withAllModules)
    {
        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var center = new CenterManagement.Data.Entities.Center
        {
            Name = $"Subscription Center {Guid.NewGuid():N}",
            IsActive = true,
            Status = CenterStatus.Active,
            GraceDays = 3
        };
        context.Centers.Add(center);
        context.SaveChanges();

        if (withAllModules)
        {
            context.CenterModules.AddRange(CenterModuleFactory.CreateFullSet(center.Id));
            context.SaveChanges();
        }

        var phone = "011" + (Guid.NewGuid().ToString("N")[..8]);
        var user = new User
        {
            Id = Guid.NewGuid(),
            FullName = "Subscription Teacher",
            UserName = phone,
            PhoneNumber = phone,
            EmailConfirmed = true,
            CenterId = center.Id
        };
        context.Users.Add(user);
        context.SaveChanges();

        return (center.Id, user.Id);
    }

    private void SetSubscription(Guid centerId, DateTime start, DateTime? end, int graceDays, CenterStatus status)
    {
        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var center = context.Centers.IgnoreQueryFilters().First(c => c.Id == centerId);
        center.SubscriptionStart = start;
        center.SubscriptionEnd = end;
        center.GraceDays = graceDays;
        center.Status = status;
        context.SaveChanges();
    }

    private HttpClient Client(string role, Guid userId, Guid centerId)
    {
        var client = _factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            BaseAddress = new Uri("https://localhost"),
            AllowAutoRedirect = false
        });

        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(
            "Bearer", CreateToken(userId, role, centerId));

        return client;
    }

    private static string CreateToken(Guid userId, string role, Guid centerId)
    {
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, userId.ToString()),
            new("Id", userId.ToString()),
            new(ClaimTypes.Role, role),
            new(TenantClaimTypes.CenterId, centerId.ToString())
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

    private sealed class JsonEnvelope<T>
    {
        public bool Succeeded { get; set; }
        public string? Message { get; set; }
        public T? Data { get; set; }
    }
}

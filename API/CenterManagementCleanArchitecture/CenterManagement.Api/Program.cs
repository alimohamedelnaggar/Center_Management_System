// Abdullah Ali Elkholy

using CenterManagement.Api.BackgroundServices;
using CenterManagement.Api.RateLimiting;
using CenterManagement.Core.Hubs;
using CenterManagement.Data.Entities.Identity;
using CenterManagement.Infrustructure.Data;
// Identity
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Localization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Infrastructure;
using Microsoft.AspNetCore.Mvc.Routing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
// Serilog
using Serilog;
using System.Globalization;
using System.Linq;

var builder = WebApplication.CreateBuilder(args);

// Safety gates run before any service resolution. They only parse the
// configured connection string; no database connection is opened here.
if (builder.Environment.IsEnvironment(E2ESeedSafety.RequiredEnvironment))
{
    var safety = E2ESeedSafety.ValidateOrThrow(
        builder.Environment.EnvironmentName,
        builder.Configuration.GetConnectionString("DefaultConnection"),
        Environment.GetEnvironmentVariable(E2ESeedSafety.AllowSeedEnvironmentVariable));

    // This line is the first startup proof that the process is in E2E and
    // points at the allowed local/CI E2E database. It never includes a password.
    Console.WriteLine(
        $"[E2E SAFETY] PASS environment={builder.Environment.EnvironmentName} " +
        $"server={safety.Server} database={safety.Database}");
    Console.Out.Flush();
}

// Development-only test centers must never be seeded into a remote database.
if (builder.Configuration.GetValue<bool>("Seed:TestCentersEnabled"))
{
    E2ESeedSafety.ValidateLocalServerOrThrow(
        builder.Configuration.GetConnectionString("DefaultConnection"),
        "Seed:TestCentersEnabled");
}

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddHttpContextAccessor();

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

#region Dependency Injections

builder.Services
    .AddInfrastructureServices(builder.Configuration)
    .AddInfrastructureDependencies(builder.Configuration)
    .AddCoreDependencies();

#endregion

#region Localization

builder.Services.AddControllersWithViews();

builder.Services.AddLocalization(options =>
{
    options.ResourcesPath = "";
});

builder.Services.Configure<RequestLocalizationOptions>(options =>
{
    List<CultureInfo> supportedCultures =
    [
        new CultureInfo("en-US"),
        new CultureInfo("de-DE"),
        new CultureInfo("fr-FR"),
        new CultureInfo("ar-EG")
    ];

    options.DefaultRequestCulture = new RequestCulture("en-US");
    options.SupportedCultures = supportedCultures;
    options.SupportedUICultures = supportedCultures;
});

#endregion

builder.Services.AddSingleton<IActionContextAccessor, ActionContextAccessor>();

builder.Services.AddTransient<IUrlHelper>(serviceProvider =>
{
    var actionContext =
        serviceProvider.GetRequiredService<IActionContextAccessor>()
            .ActionContext;

    var factory =
        serviceProvider.GetRequiredService<IUrlHelperFactory>();

    return factory.GetUrlHelper(actionContext);
});

builder.Services.AddTransient<AuthFilter>();

// Scheduled question exam reminders
if (!builder.Environment.IsEnvironment("E2E"))
{
    builder.Services.AddHostedService<QuestionExamReminderService>();

    // Scheduled parent "overdue subscription" notifications
    builder.Services.AddHostedService<ParentOverdueReminderService>();
}

// Serilog
Log.Logger = new LoggerConfiguration()
    .ReadFrom.Configuration(builder.Configuration)
    .WriteTo.Console()
    .CreateLogger();

builder.Services.AddSerilog();

// The API runs behind a reverse proxy, so the rate limiter (and the audit log)
// must read the client IP from the X-Forwarded-* headers instead of the proxy's.
// Known networks/proxies are cleared because the deployment terminates at a
// trusted proxy whose address is not fixed in configuration.
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    options.KnownNetworks.Clear();
    options.KnownProxies.Clear();
});

var app = builder.Build();

// Swagger
app.UseSwagger();
app.UseSwaggerUI();

#region Identity Seeder

using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;

    if (app.Environment.IsEnvironment("E2E"))
    {
        // Two dedicated, fully fictional data sets. The marketing seeder is
        // opt-in (E2E_MARKETING_SEED=1) and a separate PowerShell runner points
        // it at CenterManagement_E2E_Marketing, so it never touches the Stage C
        // database. Both seeders apply pending migrations and create the
        // Identity roles.
        if (string.Equals(
                Environment.GetEnvironmentVariable("E2E_MARKETING_SEED"),
                "1",
                StringComparison.Ordinal))
        {
            await E2EMarketingSeeder.SeedAsync(services);
        }
        else
        {
            await E2ESeeder.SeedAsync(services);
        }
    }
    else
    {
        await IdentitySeeder.SeedAsync(services);
    }
}

#endregion

// NOTE: SuperAdmin / CenterOwner accounts are seeded by IdentitySeeder using
// passwords from configuration (Seed:SuperAdminPassword, Seed:CenterOwnerPassword).
// They are not created when no password is configured.

#region Localization Middleware

var localizationOptions =
    app.Services.GetRequiredService<IOptions<RequestLocalizationOptions>>();

app.UseRequestLocalization(localizationOptions.Value);

#endregion

app.UseForwardedHeaders();

app.UseHttpsRedirection();

app.UseCors("AllowCORS");

app.UseStaticFiles();

// Brute-force protection for the sign-in endpoint (per-IP and per-phone).
app.UseMiddleware<SignInRateLimitingMiddleware>();

app.UseAuthentication();

// Enforce center/account lifecycle on every authenticated request so a
// suspension or expiry takes effect immediately.
app.UseMiddleware<CenterManagement.Api.Middleware.CenterAccessEnforcementMiddleware>();

// A temporary password must be changed before anything else can be used.
app.UseMiddleware<CenterManagement.Api.Middleware.PasswordChangeEnforcementMiddleware>();

app.UseAuthorization();

app.MapControllers();

// SignalR Hubs
app.MapHub<StudentHub>("/hubs/students");
app.MapHub<GroupHub>("/hubs/groupHub");
app.MapHub<SessionHub>("/hubs/sessions");
app.MapHub<PaymentHub>("/hubs/payments");
app.MapHub<ExamHub>("/hubs/exams");
app.MapHub<StudentAttandanceHub>("/hubs/attendance");
app.MapHub<ExpenseHub>("/hubs/expense");
app.MapHub<ExpenseCategoryHub>("/hubs/expense-categories");
app.MapHub<IncomeHub>("/hubs/income");
app.MapHub<IncomeCategoryHub>("/hubs/income-categories");
app.MapHub<NotificationHub>("/hubs/notifications");

app.MapGet("/", () =>
{
    return Results.Redirect("/swagger");
});

app.Run();

// Exposes the implicit top-level Program type to the integration test project
// (WebApplicationFactory<Program>).
public partial class Program { }
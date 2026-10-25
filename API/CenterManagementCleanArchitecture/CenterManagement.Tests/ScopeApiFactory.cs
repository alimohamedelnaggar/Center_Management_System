using System.Collections.Concurrent;
using CenterManagement.Api.BackgroundServices;
using CenterManagement.Core.Bases;
using CenterManagement.Core.Features.Shared.EmailFeature.Commands.Models;
using CenterManagement.Data.Entities.Abstractions;
using CenterManagement.Infrustructure.Data;
using CenterManagement.Infrustructure.Interceptors;
using MediatR;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace CenterManagement.Tests;

/// <summary>
/// Boots the real API through <see cref="WebApplicationFactory{TEntryPoint}"/>
/// with the SQL Server provider swapped for a private file-backed SQLite
/// database, so the endpoint tests exercise the actual HTTP pipeline,
/// authorization policies, MediatR handlers and scoping services.
/// </summary>
public class ScopeApiFactory : WebApplicationFactory<Program>
{
    public const string JwtSecret = "CenterManagementCleanArchitectureKey";

    /// <summary>
    /// Every email the application tries to send through MediatR during a test
    /// is captured here instead of hitting a real SMTP server.
    /// </summary>
    public static readonly ConcurrentQueue<SendEmailCommand> SentEmails = new();

    public static void ClearSentEmails()
    {
        while (SentEmails.TryDequeue(out _))
        {
        }
    }

    private readonly string _databasePath =
        Path.Combine(Path.GetTempPath(), $"center_scope_{Guid.NewGuid():N}.db");

    private SeedResult? _seed;

    private string ConnectionString => $"DataSource={_databasePath}";

    /// <summary>Seeds the deterministic two-center graph exactly once.</summary>
    public SeedResult EnsureSeeded()
    {
        if (_seed is not null)
            return _seed;

        using var scope = Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var seed = TestData.Seed(context);

        // Link Assistant A to Teacher A so the assistant's scope collapses to
        // Teacher A's groups only (the "linked" variant of the scope rules).
        var assistant = context.Assistents.First(a => a.Id == seed.AssistantA);
        assistant.TeacherId = seed.TeacherA;
        context.SaveChanges();

        _seed = seed;
        return _seed;
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        // The application seeds roles/accounts synchronously on startup, so the
        // schema has to exist before the host finishes starting.
        EnsureSchema();

        builder.UseEnvironment("Testing");

        // The tracked appsettings.json intentionally carries no JWT secret (it
        // was masked so no real secret is committed). The tests forge tokens
        // with JwtSecret, so the host must validate against the same value —
        // supplied in-memory here rather than from a tracked file.
        builder.UseSetting("jwtSettings:secret", JwtSecret);

        builder.ConfigureTestServices(services =>
        {
            ReplaceDatabase(services);

            // The reminder jobs poll the database on a timer; removing them keeps
            // the tests deterministic (a background crash would stop the host).
            var hostedJobs = new[]
            {
                typeof(QuestionExamReminderService),
                typeof(ParentOverdueReminderService)
            };

            foreach (var descriptor in services
                         .Where(d => d.ImplementationType is not null &&
                                     hostedJobs.Contains(d.ImplementationType))
                         .ToList())
            {
                services.Remove(descriptor);
            }

            ReplaceEmailSender(services);
        });
    }

    private static void ReplaceEmailSender(IServiceCollection services)
    {
        var obsolete = services
            .Where(d => d.ServiceType == typeof(IRequestHandler<SendEmailCommand, Response<string>>))
            .ToList();

        foreach (var descriptor in obsolete)
            services.Remove(descriptor);

        services.AddTransient<IRequestHandler<SendEmailCommand, Response<string>>, CapturingEmailSender>();
    }

    private void ReplaceDatabase(IServiceCollection services)
    {
        var obsolete = services
            .Where(d =>
                d.ServiceType == typeof(AppDbContext) ||
                d.ServiceType == typeof(DbContextOptions<AppDbContext>) ||
                d.ServiceType == typeof(DbContextOptions) ||
                (d.ServiceType.IsGenericType &&
                 d.ServiceType.GetGenericTypeDefinition() == typeof(IDbContextOptionsConfiguration<>)))
            .ToList();

        foreach (var descriptor in obsolete)
            services.Remove(descriptor);

        services.AddDbContext<AppDbContext>((sp, options) =>
        {
            options.UseSqlite(ConnectionString);

            // Mirror the production registration: without these interceptors the
            // tenant CenterId is never stamped on HTTP-created entities, so any
            // follow-up scoped request (edit/pay/list) cannot find them.
            options.AddInterceptors(
                sp.GetRequiredService<SoftDeleteInterceptor>(),
                sp.GetRequiredService<TenantInterceptor>());
        });
    }

    private void EnsureSchema()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlite(ConnectionString)
            .Options;

        using var context = new AppDbContext(options, new TestTenantContext { IsUnrestricted = true });
        context.Database.EnsureCreated();
    }

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);

        if (!disposing)
            return;

        try
        {
            if (File.Exists(_databasePath))
                File.Delete(_databasePath);
        }
        catch (IOException)
        {
            // Leftover temp file is harmless.
        }
    }
}

/// <summary>
/// Test double that captures outgoing mail instead of connecting to SMTP.
/// </summary>
public sealed class CapturingEmailSender : IRequestHandler<SendEmailCommand, Response<string>>
{
    public Task<Response<string>> Handle(SendEmailCommand request, CancellationToken cancellationToken)
    {
        ScopeApiFactory.SentEmails.Enqueue(request);

        return Task.FromResult(new Response<string>("captured", true)
        {
            Succeeded = true,
            StatusCode = System.Net.HttpStatusCode.OK
        });
    }
}

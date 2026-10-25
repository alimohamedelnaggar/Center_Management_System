using CenterManagement.Core.Features.ParentPortalFeature.Services;
using CenterManagement.Core.Features.Payments.Shared;
using CenterManagement.Data.AppMetaData;
using CenterManagement.Data.Entities.Abstractions;

[assembly: System.Runtime.CompilerServices.InternalsVisibleTo("CenterManagement.Tests")]

namespace CenterManagement.Api.BackgroundServices;

/// <summary>
/// Daily job that warns the linked parents of every student who still owes money
/// for the current billing month. The due amounts come from the very same
/// <see cref="IMonthlyDueService"/> the overdue page uses, and the write itself
/// is delegated to the shared parent notifier, which enforces the center's
/// module flags and de-duplicates the row — so running the job twice on the same
/// day (or on every restart) produces exactly one notification per child.
/// </summary>
public class ParentOverdueReminderService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<ParentOverdueReminderService> _logger;
    private readonly TimeSpan _checkInterval;

    public ParentOverdueReminderService(
        IServiceScopeFactory scopeFactory,
        IConfiguration configuration,
        ILogger<ParentOverdueReminderService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
        _checkInterval = TimeSpan.FromMinutes(
            configuration.GetValue("ParentOverdueReminder:CheckMinutes", 1440));
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await RunOnceAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send parent overdue notifications.");
            }

            try
            {
                await Task.Delay(_checkInterval, stoppingToken);
            }
            catch (OperationCanceledException)
            {
                break;
            }
        }
    }

    internal async Task RunOnceAsync(CancellationToken cancellationToken)
    {
        using var scope = _scopeFactory.CreateScope();
        var dueService = scope.ServiceProvider.GetRequiredService<IMonthlyDueService>();
        var parentNotifier = scope.ServiceProvider.GetRequiredService<IParentNotificationService>();

        var period = new DateOnly(DateTime.Today.Year, DateTime.Today.Month, 1);

        var due = await dueService.CalculateDueAsync(
            UserScope.Full,
            allowedGroupIds: null,
            period,
            search: null,
            cancellationToken);

        var overdue = due.Where(x => x.IsOverdue).ToList();

        if (overdue.Count == 0)
            return;

        foreach (var row in overdue)
        {
            var body = $"يوجد مبلغ مستحق عن شهر {period:yyyy/MM} للطالب {row.StudentName}.";

            try
            {
                await parentNotifier.NotifyStudentParentsAsync(
                    row.StudentId,
                    ParentNotificationTypes.PaymentOverdue,
                    ModuleKeys.Payments,
                    eventReferenceId: row.StudentId,
                    eventReferenceType: $"PaymentOverdue:{period:yyyy-MM}",
                    title: "اشتراك متأخر",
                    body,
                    cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Failed to send a parent overdue notification for student {StudentId}.",
                    row.StudentId);
            }
        }
    }
}

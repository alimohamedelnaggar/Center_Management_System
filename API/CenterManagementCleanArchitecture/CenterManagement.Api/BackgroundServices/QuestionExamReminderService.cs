using CenterManagement.Core.Features.NotificationFeature.Dtos;
using CenterManagement.Core.Hubs.Abstractions;
using CenterManagement.Data.AppMetaData;
using CenterManagement.Data.Entities.Abstractions;
using CenterManagement.Data.Entities.Notifications;
using CenterManagement.Data.Enums;
using CenterManagement.Infrustructure.InfrastructureBases.Bases;
using Microsoft.EntityFrameworkCore;
using System.Runtime.CompilerServices;

[assembly: InternalsVisibleTo("CenterManagement.Tests")]

namespace CenterManagement.Api.BackgroundServices;

public class QuestionExamReminderService : BackgroundService
{
    private const string ReminderType = "QuestionExamReminder";

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<QuestionExamReminderService> _logger;
    private readonly TimeSpan _checkInterval;
    private readonly TimeSpan _leadTime;

    public QuestionExamReminderService(
        IServiceScopeFactory scopeFactory,
        IConfiguration configuration,
        ILogger<QuestionExamReminderService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
        _checkInterval = TimeSpan.FromMinutes(
            configuration.GetValue("ExamReminder:CheckMinutes", 5));
        _leadTime = TimeSpan.FromMinutes(
            configuration.GetValue("ExamReminder:LeadMinutes", 60));
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await SendDueRemindersAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send question exam reminders.");
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

    internal async Task SendDueRemindersAsync(CancellationToken cancellationToken)
    {
        using var scope = _scopeFactory.CreateScope();
        var manager = scope.ServiceProvider.GetRequiredService<IRepositoryManager>();
        var pusher = scope.ServiceProvider.GetRequiredService<INotificationPusher>();
        var centerModules = scope.ServiceProvider.GetRequiredService<ICenterModuleService>();

        var now = DateTime.Now;
        var until = now.Add(_leadTime);

        var dueExams = await manager.QuestionExamRepository.GetTableNoTracking()
            .Where(x => x.Mode == QuestionExamMode.Electronic &&
                        x.ExamDate > now &&
                        x.ExamDate <= until)
            .Select(x => new
            {
                x.Id,
                x.Name,
                x.ExamDate,
                x.GroupId,
                x.CenterId
            })
            .ToListAsync(cancellationToken);

        if (dueExams.Count == 0)
            return;

        // Online-exam reminders are a paid feature: a center that does not have
        // the online_exams module enabled must not receive any. Resolve the
        // module state once per distinct center (the service caches it).
        var onlineExamsEnabled = new Dictionary<Guid, bool>();
        foreach (var centerId in dueExams
                     .Where(x => x.CenterId.HasValue)
                     .Select(x => x.CenterId!.Value)
                     .Distinct())
        {
            onlineExamsEnabled[centerId] = await centerModules.IsEnabledAsync(
                centerId, ModuleKeys.OnlineExams, cancellationToken);
        }

        dueExams = dueExams
            .Where(x => !x.CenterId.HasValue || onlineExamsEnabled[x.CenterId.Value])
            .ToList();

        if (dueExams.Count == 0)
            return;

        var examIds = dueExams.Select(x => x.Id).ToList();

        var alreadyReminded = await manager.NotificationRepository.GetTableNoTracking()
            .Where(n => n.Type == ReminderType &&
                        n.ReferenceId != null &&
                        examIds.Contains(n.ReferenceId.Value))
            .Select(n => n.ReferenceId!.Value)
            .Distinct()
            .ToListAsync(cancellationToken);

        var remindedSet = alreadyReminded.ToHashSet();

        foreach (var exam in dueExams)
        {
            if (remindedSet.Contains(exam.Id))
                continue;

            var userIds = await manager.StudentGroupRepository.GetTableNoTracking()
                .Where(sg => sg.GroupId == exam.GroupId &&
                             sg.IsActive &&
                             sg.LeftAt == null)
                .Select(sg => sg.Student.UserId)
                .Where(id => id != null)
                .Select(id => id!.Value)
                .Distinct()
                .ToListAsync(cancellationToken);

            if (userIds.Count == 0)
                continue;

            var minutesLeft = Math.Max(1, (int)Math.Round((exam.ExamDate - now).TotalMinutes));
            const string title = "تذكير بموعد الامتحان";
            var body = $"امتحان \"{exam.Name}\" يبدأ خلال {minutesLeft} دقيقة (الساعة {exam.ExamDate:HH:mm}).";

            var notifications = userIds.Select(uid => new Notification
            {
                UserId = uid,
                Title = title,
                Body = body,
                Type = ReminderType,
                ReferenceId = exam.Id,
                ReferenceType = "QuestionExam"
            }).ToList();

            await manager.NotificationRepository.AddRangeAsync(notifications);
            await manager.SaveChangesAsync();

            await pusher.PushAsync(userIds, new NotificationDTO
            {
                Title = title,
                Body = body,
                Type = ReminderType,
                ReferenceId = exam.Id,
                ReferenceType = "QuestionExam",
                IsRead = false,
                CreatedAt = DateTime.UtcNow
            });
        }
    }
}

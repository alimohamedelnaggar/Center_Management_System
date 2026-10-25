using CenterManagement.Api.BackgroundServices;
using CenterManagement.Data.AppMetaData;
using CenterManagement.Data.Entities.Abstractions;
using CenterManagement.Data.Entities.QuestionBank;
using CenterManagement.Data.Enums;
using CenterManagement.Infrustructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace CenterManagement.Tests;

/// <summary>
/// The exam-reminder background job is a paid (online_exams) feature: it must
/// only queue notifications for centers that actually bought the module, and
/// silently ignore exams belonging to a center that does not.
/// </summary>
public sealed class QuestionExamReminderTests : IDisposable
{
    private readonly ScopeApiFactory _factory;
    private readonly SeedResult _seed;

    public QuestionExamReminderTests()
    {
        _factory = new ScopeApiFactory();
        _seed = _factory.EnsureSeeded();

        // The service resolves recipients from StudentGroup.Student.UserId, so the
        // seeded student needs a linked login account to receive a notification.
        Write(ctx =>
        {
            var student = ctx.Students.First(s => s.Id == _seed.StudentA);
            student.UserId = _seed.TeacherA;
        });
    }

    public void Dispose() => _factory.Dispose();

    [Fact]
    public async Task Reminder_Sends_For_Center_With_OnlineExams()
    {
        var examId = SeedElectronicExam(DateTime.Now.AddMinutes(30));

        await RunReminderAsync();

        Assert.True(await NotificationExists(examId), "expected a reminder for an online_exams center");
    }

    [Fact]
    public async Task Reminder_Skips_Exams_Of_Center_Without_OnlineExams()
    {
        DisableOnlineExams(_seed.CenterA);
        var examId = SeedElectronicExam(DateTime.Now.AddMinutes(30));

        await RunReminderAsync();

        Assert.False(await NotificationExists(examId), "a center without online_exams must not get reminders");
    }

    private async Task RunReminderAsync()
    {
        var scopeFactory = _factory.Services.GetRequiredService<IServiceScopeFactory>();
        var configuration = _factory.Services.GetRequiredService<IConfiguration>();
        var logger = _factory.Services.GetRequiredService<ILogger<QuestionExamReminderService>>();

        var service = new QuestionExamReminderService(scopeFactory, configuration, logger);
        await service.SendDueRemindersAsync(CancellationToken.None);
    }

    private async Task<bool> NotificationExists(Guid examId)
    {
        using var scope = _factory.Services.CreateScope();
        var ctx = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        return await ctx.Notifications
            .IgnoreQueryFilters()
            .AnyAsync(n => n.ReferenceId == examId && n.UserId == _seed.TeacherA);
    }

    private Guid SeedElectronicExam(DateTime examDate)
    {
        var id = Guid.NewGuid();

        Write(ctx =>
        {
            var academicYear = ctx.AcademicYears.FirstOrDefault();
            if (academicYear is null)
            {
                academicYear = new AcademicYear { Id = Guid.NewGuid(), Name = "2026", Order = 1 };
                ctx.AcademicYears.Add(academicYear);
            }

            ctx.QuestionExams.Add(new QuestionExam
            {
                Id = id,
                Name = $"Electronic Exam {Guid.NewGuid():N}",
                GroupId = _seed.GroupA,
                AcademicYearId = academicYear.Id,
                Mode = QuestionExamMode.Electronic,
                ExamDate = examDate,
                DurationMinutes = 30,
                CenterId = _seed.CenterA
            });
        });

        return id;
    }

    private void DisableOnlineExams(Guid centerId)
    {
        Write(ctx =>
        {
            var row = ctx.CenterModules
                .IgnoreQueryFilters()
                .First(m => m.CenterId == centerId &&
                            m.ModuleKey == ModuleKeys.OnlineExams &&
                            !m.IsDeleted);
            row.IsEnabled = false;
        });

        // The module service caches the enabled set for a short TTL; drop it so
        // the reminder job sees the change immediately.
        using var scope = _factory.Services.CreateScope();
        scope.ServiceProvider.GetRequiredService<ICenterModuleService>().Invalidate(centerId);
    }

    private void Write(Action<AppDbContext> action)
    {
        using var scope = _factory.Services.CreateScope();
        var ctx = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        action(ctx);
        ctx.SaveChanges();
    }
}

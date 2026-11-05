using CenterManagement.Core.Behaviors;
using CenterManagement.Core.Features.ParentPortalFeature.Services;
using CenterManagement.Core.Features.Shared.EmailFeature.Senders;
using CenterManagement.Core.Features.UsersFeature.Students.Services;
using CenterManagement.Core.Features.Payments.Shared;
using CenterManagement.Data.Helpers;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using System.Reflection;

namespace CenterManagement.Core;

public static class ModuleCoreDependencies
{
    public static IServiceCollection AddCoreDependencies(this IServiceCollection services)
    {
        //Configuration Of Mediator
        services.AddMediatR(cfg => cfg.RegisterServicesFromAssemblies(Assembly.GetExecutingAssembly()));


        // Get Validators
        services.AddValidatorsFromAssembly(Assembly.GetExecutingAssembly());
        // 
        services.AddTransient(typeof(IPipelineBehavior<,>), typeof(ValidationBehavior<,>));


        services.AddSignalR();


        #region Hubs
        services.AddScoped<IStudentNotificationService, StudentNotificationService>();

        services.AddScoped<IGroupNotificationService, GroupNotificationService>();

        services.AddScoped<ISessionNotificationService, SessionNotificationService>();
        services.AddScoped<IStudentAttendanceNotification, StudentAttendanceNotification>();
        services.AddScoped<IPaymentNotificationService, PaymentNotificationService>();
        services.AddScoped<IExamNotification, ExamNotification>();
        services.AddScoped<IExpenseNotification, ExpenseNotification>();
        services.AddScoped<IExpenseCategoryNotification, ExpenseCategoryNotification>();
        services.AddScoped<IIncomeNotification, IncomeNotification>();
        services.AddScoped<IIncomeCategoryNotification, IncomeCategoryNotification>();
        #endregion

        services.AddScoped<INotificationPusher, NotificationPusher>();

        // Shared monthly-due calculation (overdue page + center-wide reports).
        services.AddScoped<IMonthlyDueService, MonthlyDueService>();

        // Parent-portal notifications (attendance / results / overdue dues).
        services.AddScoped<IParentNotificationService, ParentNotificationService>();

        // Shared parent-account creation (single student + bulk run).
        services.AddScoped<IParentAccountService, ParentAccountService>();
        services.AddScoped<IStudentCreationService, StudentCreationService>();
        services.AddScoped<IStudentAccountService, StudentAccountService>();
        services.AddMemoryCache();
        services.AddSingleton<IImportSessionStore, ImportSessionStore>();

        // Outgoing mail: the fake in-memory transport is the default. The real
        // SMTP transport only runs when Email:UseRealSender=true, and it can
        // never run in Testing/E2E where a test run must not email anyone.
        services.AddScoped<IEmailSender>(provider =>
        {
            var environment = provider.GetService<IHostEnvironment>();
            var configuration = provider.GetService<IConfiguration>();
            var loggerFactory = provider.GetRequiredService<ILoggerFactory>();

            var isProtectedEnvironment = environment is not null &&
                                         (environment.IsEnvironment("Testing") ||
                                          environment.IsEnvironment("E2E"));

            var realSenderRequested = bool.TryParse(
                configuration?["Email:UseRealSender"],
                out var useRealSender) && useRealSender;

            if (isProtectedEnvironment || !realSenderRequested)
                return new FakeEmailSender(loggerFactory.CreateLogger<FakeEmailSender>());

            var settings = provider.GetService<EmailSettings>() ?? new EmailSettings();
            return new SmtpEmailSender(settings, loggerFactory.CreateLogger<SmtpEmailSender>());
        });

        return services;
    }

}

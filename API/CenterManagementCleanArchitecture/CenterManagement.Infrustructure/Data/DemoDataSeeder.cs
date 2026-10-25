using CenterManagement.Data.AppMetaData;
using CenterManagement.Data.Entities;
using CenterManagement.Data.Entities.Identity;
using CenterManagement.Data.Entities.Subscriptions;
using CenterManagement.Data.Entities.Teachers;
using CenterManagement.Data.Entities.Users;
using CenterManagement.Data.Enums;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace CenterManagement.Infrustructure.Data;

/// <summary>
/// DEV-ONLY, OPT-IN demo data. It never runs unless it is explicitly enabled
/// (<c>Seed:DemoEnabled = true</c>) <b>and</b> the host is in the Development
/// environment, and it needs a configured <c>Seed:DemoPassword</c>. It creates a
/// demo center plus one teacher and one student login account so the app can be
/// explored quickly. See <c>DEMO_ACCOUNTS.md</c> (demo only, never production).
/// </summary>
public static class DemoDataSeeder
{
    private const string DemoCenterName = "المركز التجريبي";
    private const string DefaultTestCenterPassword = "TestCenter@123";

    public static async Task SeedAsync(IServiceProvider serviceProvider)
    {
        var configuration = serviceProvider.GetRequiredService<IConfiguration>();
        var logger = serviceProvider.GetRequiredService<ILoggerFactory>()
            .CreateLogger(nameof(DemoDataSeeder));

        var userManager = serviceProvider.GetRequiredService<UserManager<User>>();
        var dbContext = serviceProvider.GetRequiredService<AppDbContext>();

        // Subscription-state test centers (Development-only). Independent of the
        // demo accounts below so they can be seeded on their own.
        if (configuration.GetValue<bool>("Seed:TestCentersEnabled"))
        {
            var testCenterPassword =
                configuration["Seed:TestCenterPassword"] ?? DefaultTestCenterPassword;

            await EnsureTestCentersAsync(dbContext, userManager, logger, testCenterPassword);
        }

        if (!configuration.GetValue<bool>("Seed:DemoEnabled"))
        {
            logger.LogInformation(
                "Demo seeder skipped: Seed:DemoEnabled is not true.");
            return;
        }

        var password = configuration["Seed:DemoPassword"];

        if (string.IsNullOrWhiteSpace(password))
        {
            logger.LogWarning(
                "Demo seeder enabled but Seed:DemoPassword is not configured. " +
                "No demo accounts were created.");
            return;
        }

        var teacherPhone = configuration["Seed:DemoTeacherPhone"] ?? "01000000007";
        var studentPhone = configuration["Seed:DemoStudentPhone"] ?? "01000000008";

        var center = await EnsureDemoCenterAsync(dbContext);

        await EnsureTeacherAsync(userManager, dbContext, logger, teacherPhone, password, center.Id);
        await EnsureStudentAsync(userManager, dbContext, logger, studentPhone, password, center.Id);

        // Every center must own its module rows (a missing row means "disabled").
        // Additive only: existing rows (e.g. from the backfill migration) are left as-is.
        await EnsureModulesAsync(dbContext, center.Id, ModuleKeys.All);

        logger.LogInformation(
            "Demo accounts ready (teacher {TeacherPhone}, student {StudentPhone}). " +
            "See DEMO_ACCOUNTS.md for the documented credentials.",
            teacherPhone, studentPhone);
    }

    /// <summary>
    /// Creates four clearly-labelled centers used to exercise the subscription state
    /// machine in Development: one inside its grace window, one expired beyond grace,
    /// one attendance-only, and one Lifetime. Each center gets an owner login so the
    /// state can be inspected from the app. Additive only — existing rows are never
    /// modified or deleted.
    /// </summary>
    private static async Task EnsureTestCentersAsync(
        AppDbContext dbContext,
        UserManager<User> userManager,
        ILogger logger,
        string password)
    {
        var now = DateTime.UtcNow;

        var graceCenter = await EnsureTestCenterAsync(
            dbContext, "مركز اختبار - فترة سماح",
            SubscriptionPlanType.Annual, now.AddDays(-363), now.AddDays(-2),
            ModuleKeys.All);

        var expiredCenter = await EnsureTestCenterAsync(
            dbContext, "مركز اختبار - منتهي الصلاحية",
            SubscriptionPlanType.Annual, now.AddDays(-375), now.AddDays(-10),
            ModuleKeys.All);

        var attendanceCenter = await EnsureTestCenterAsync(
            dbContext, "مركز اختبار - حضور فقط",
            SubscriptionPlanType.Annual, now.AddDays(-30), now.AddDays(335),
            [ModuleKeys.Attendance]);

        var lifetimeCenter = await EnsureTestCenterAsync(
            dbContext, "مركز اختبار - مدى الحياة",
            SubscriptionPlanType.Lifetime, now.AddDays(-30), null,
            ModuleKeys.All);

        await EnsureTestCenterOwnerAsync(
            dbContext, userManager, logger, graceCenter, "01000000101", password);
        await EnsureTestCenterOwnerAsync(
            dbContext, userManager, logger, expiredCenter, "01000000102", password);
        await EnsureTestCenterOwnerAsync(
            dbContext, userManager, logger, attendanceCenter, "01000000103", password);
        await EnsureTestCenterOwnerAsync(
            dbContext, userManager, logger, lifetimeCenter, "01000000104", password);

        logger.LogInformation(
            "Demo/test centers ready (grace, expired, attendance-only, lifetime) " +
            "with owner logins 01000000101-01000000104.");
    }

    private static async Task EnsureTestCenterOwnerAsync(
        AppDbContext dbContext,
        UserManager<User> userManager,
        ILogger logger,
        Center center,
        string phone,
        string password)
    {
        var owner = await EnsureUserAsync(
            userManager, phone, password, $"مالك {center.Name}",
            AppRoles.CenterOwner, center.Id);

        if (owner is null)
        {
            logger.LogWarning(
                "Test center owner could not be created for {Phone}.", phone);
            return;
        }

        if (center.OwnerId is null)
        {
            center.OwnerId = owner.Id;
            await dbContext.SaveChangesAsync();
        }
    }

    private static async Task<Center> EnsureTestCenterAsync(
        AppDbContext dbContext,
        string name,
        SubscriptionPlanType type,
        DateTime start,
        DateTime? end,
        IReadOnlyCollection<string> enabledKeys)
    {
        var center = await dbContext.Centers.FirstOrDefaultAsync(c => c.Name == name);

        if (center is null)
        {
            center = new Center
            {
                Name = name,
                IsActive = true,
                Status = CenterStatus.Active,
                GraceDays = 3,
                SubscriptionStart = start,
                SubscriptionEnd = end,
                Plan = type.ToString()
            };

            dbContext.Centers.Add(center);
            await dbContext.SaveChangesAsync();
        }
        else if (string.IsNullOrWhiteSpace(center.Plan))
        {
            // Keep the demo center's plan label in sync with its subscription so
            // the "My subscription" view shows a real plan (seeder-created centers
            // previously left Center.Plan empty).
            center.Plan = type.ToString();
            await dbContext.SaveChangesAsync();
        }

        await EnsureModulesAsync(dbContext, center.Id, enabledKeys);
        await EnsureSubscriptionAsync(dbContext, center.Id, type, start, end);

        return center;
    }

    /// <summary>
    /// Inserts a <see cref="CenterModule"/> row for every key in
    /// <see cref="ModuleKeys.All"/> that is missing for the center, marking it enabled
    /// only when it is in <paramref name="enabledKeys"/>. Existing rows are untouched.
    /// </summary>
    private static async Task EnsureModulesAsync(
        AppDbContext dbContext,
        Guid centerId,
        IReadOnlyCollection<string> enabledKeys)
    {
        var existing = await dbContext.CenterModules
            .Where(m => m.CenterId == centerId)
            .Select(m => m.ModuleKey)
            .ToListAsync();

        var missing = ModuleKeys.All.Where(k => !existing.Contains(k)).ToList();

        if (missing.Count == 0)
            return;

        foreach (var key in missing)
        {
            dbContext.CenterModules.Add(new CenterModule
            {
                CenterId = centerId,
                ModuleKey = key,
                IsEnabled = enabledKeys.Contains(key)
            });
        }

        await dbContext.SaveChangesAsync();
    }

    private static async Task EnsureSubscriptionAsync(
        AppDbContext dbContext,
        Guid centerId,
        SubscriptionPlanType type,
        DateTime start,
        DateTime? end)
    {
        var hasSubscription = await dbContext.CenterSubscriptions
            .AnyAsync(s => s.CenterId == centerId);

        if (hasSubscription)
            return;

        dbContext.CenterSubscriptions.Add(new CenterSubscription
        {
            CenterId = centerId,
            Type = type,
            StartDate = start,
            EndDate = end,
            Price = 0,
            PaidAmount = 0,
            Notes = "بيانات تجريبية"
        });

        await dbContext.SaveChangesAsync();
    }

    private static async Task<Center> EnsureDemoCenterAsync(AppDbContext dbContext)
    {
        var center = await dbContext.Centers.FirstOrDefaultAsync(c => c.Name == DemoCenterName)
                     ?? await dbContext.Centers.FirstOrDefaultAsync();

        if (center is not null)
            return center;

        center = new Center
        {
            Name = DemoCenterName,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        dbContext.Centers.Add(center);
        await dbContext.SaveChangesAsync();

        return center;
    }

    private static async Task EnsureTeacherAsync(
        UserManager<User> userManager,
        AppDbContext dbContext,
        ILogger logger,
        string phone,
        string password,
        Guid centerId)
    {
        var teacher = await EnsureUserAsync(
            userManager, phone, password, "مدرس تجريبي", AppRoles.Teacher, centerId);

        if (teacher is null)
        {
            logger.LogWarning("Demo teacher account could not be created for {Phone}.", phone);
            return;
        }

        var hasProfile = await dbContext.TeacherProfiles.AnyAsync(p => p.UserId == teacher.Id);

        if (!hasProfile)
        {
            dbContext.TeacherProfiles.Add(new TeacherProfile
            {
                UserId = teacher.Id,
                Subject = "تجريبي",
                CenterId = centerId
            });

            await dbContext.SaveChangesAsync();
        }
    }

    private static async Task EnsureStudentAsync(
        UserManager<User> userManager,
        AppDbContext dbContext,
        ILogger logger,
        string phone,
        string password,
        Guid centerId)
    {
        var user = await EnsureUserAsync(
            userManager, phone, password, "طالب تجريبي", AppRoles.Student, centerId);

        if (user is null)
        {
            logger.LogWarning("Demo student account could not be created for {Phone}.", phone);
            return;
        }

        var hasStudent = await dbContext.Students.AnyAsync(s => s.UserId == user.Id);

        if (hasStudent)
            return;

        dbContext.Students.Add(new Student
        {
            FullName = "طالب تجريبي",
            PhoneNumber = phone,
            ParentPhoneNumber = phone,
            IsActive = true,
            SubscriptionType = SubscriptionType.Session,
            UserId = user.Id,
            CenterId = centerId
        });

        await dbContext.SaveChangesAsync();
    }

    private static async Task<User?> EnsureUserAsync(
        UserManager<User> userManager,
        string phone,
        string password,
        string fullName,
        string role,
        Guid centerId)
    {
        var existing = await userManager.Users
            .FirstOrDefaultAsync(x => x.PhoneNumber == phone);

        if (existing is not null)
        {
            if (!await userManager.IsInRoleAsync(existing, role))
                await userManager.AddToRoleAsync(existing, role);

            return existing;
        }

        var user = new User
        {
            FullName = fullName,
            UserName = phone,
            PhoneNumber = phone,
            EmailConfirmed = true,
            PhoneNumberConfirmed = true,
            CenterId = centerId,
            CreatedAt = DateTime.UtcNow
        };

        var createResult = await userManager.CreateAsync(user, password);

        if (!createResult.Succeeded)
            return null;

        await userManager.AddToRoleAsync(user, role);

        return user;
    }
}

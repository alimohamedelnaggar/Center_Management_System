using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Net.Http.Headers;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using CenterManagement.Api.BackgroundServices;
using CenterManagement.Core.Features.ParentPortalFeature.Services;
using CenterManagement.Data.AppMetaData;
using CenterManagement.Data.Entities;
using CenterManagement.Data.Entities.Abstractions;
using CenterManagement.Data.Entities.Groups;
using CenterManagement.Data.Entities.Identity;
using CenterManagement.Data.Entities.Notifications;
using CenterManagement.Data.Entities.QuestionBank;
using CenterManagement.Data.Entities.Users;
using CenterManagement.Data.Enums;
using CenterManagement.Infrustructure.Data;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.IdentityModel.Tokens;

namespace CenterManagement.Tests;

/// <summary>
/// Covers Phase C1: the linked parents of a child receive in-app notifications
/// (attendance, published exam results, overdue subscription), each event is
/// written once per parent, the parent-portal module and the event's own module
/// both gate the write, and the parent notification endpoints only ever expose
/// the signed-in parent's own children.
/// </summary>
public sealed class ParentNotificationsTests : IClassFixture<ScopeApiFactory>
{
    private static long _phoneSeed = DateTime.UtcNow.Ticks;

    private readonly ScopeApiFactory _factory;
    private readonly SeedResult _seed;

    public ParentNotificationsTests(ScopeApiFactory factory)
    {
        _factory = factory;
        _seed = _factory.EnsureSeeded();
    }

    // ---------------- attendance ----------------

    [Fact]
    public async Task Attendance_Notifies_Every_Linked_Parent_Of_The_Child()
    {
        var (parent1, child1) = await CreateParentWithChildAsync(_seed.CenterA, "Attendance Child");
        var (parent2, _) = await CreateParentWithChildAsync(_seed.CenterA, "Other Child");

        // A second parent linked to the very same child also hears about it.
        var (parent1Bis, _) = await CreateParentAsync(_seed.CenterA, "Second Parent");
        await LinkAsync(parent1Bis, child1);

        var sessionId = SeedSession(_seed.CenterA, _seed.GroupA);

        var response = await SaveAttendanceAsync(
            CenterAdmin(),
            sessionId,
            new DateOnly(2026, 10, 5),
            (child1, AttendanceStatus.Absent));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        Assert.Equal(1, await CountParentNotificationsAsync(parent1, ParentNotificationTypes.Attendance));
        Assert.Equal(1, await CountParentNotificationsAsync(parent1Bis, ParentNotificationTypes.Attendance));
        Assert.Equal(0, await CountParentNotificationsAsync(parent2, ParentNotificationTypes.Attendance));
    }

    [Fact]
    public async Task Attendance_Resave_Same_Status_Does_Not_Duplicate()
    {
        var (parent, child) = await CreateParentWithChildAsync(_seed.CenterA, "Resave Child");
        var sessionId = SeedSession(_seed.CenterA, _seed.GroupA);
        var date = new DateOnly(2026, 10, 6);

        await SaveAttendanceAsync(CenterAdmin(), sessionId, date, (child, AttendanceStatus.Absent));
        await SaveAttendanceAsync(CenterAdmin(), sessionId, date, (child, AttendanceStatus.Absent));

        Assert.Equal(1, await CountParentNotificationsAsync(parent, ParentNotificationTypes.Attendance));
    }

    [Fact]
    public async Task Attendance_Status_Change_Notifies_Again()
    {
        var (parent, child) = await CreateParentWithChildAsync(_seed.CenterA, "Change Child");
        var sessionId = SeedSession(_seed.CenterA, _seed.GroupA);
        var date = new DateOnly(2026, 10, 7);

        await SaveAttendanceAsync(CenterAdmin(), sessionId, date, (child, AttendanceStatus.Absent));
        await SaveAttendanceAsync(CenterAdmin(), sessionId, date, (child, AttendanceStatus.Late));

        // A genuinely different status is a new event, so the parent is told twice.
        Assert.Equal(2, await CountParentNotificationsAsync(parent, ParentNotificationTypes.Attendance));
    }

    [Fact]
    public async Task Attendance_Not_Notified_When_ParentPortal_Disabled()
    {
        var (parent, child) = await CreateParentWithChildAsync(_seed.CenterA, "Portal Off Child");
        var sessionId = SeedSession(_seed.CenterA, _seed.GroupA);

        SetModule(_seed.CenterA, ModuleKeys.ParentPortal, false);
        try
        {
            var response = await SaveAttendanceAsync(
                CenterAdmin(),
                sessionId,
                new DateOnly(2026, 10, 8),
                (child, AttendanceStatus.Absent));

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.Equal(0, await CountParentNotificationsAsync(parent, ParentNotificationTypes.Attendance));
        }
        finally
        {
            SetModule(_seed.CenterA, ModuleKeys.ParentPortal, true);
        }
    }

    [Fact]
    public async Task Parent_Not_Notified_When_Event_Module_Disabled()
    {
        var (parent, child) = await CreateParentWithChildAsync(_seed.CenterA, "Event Off Child");

        SetModule(_seed.CenterA, ModuleKeys.Attendance, false);
        try
        {
            await NotifyDirectAsync(child, ParentNotificationTypes.Attendance, ModuleKeys.Attendance);
            Assert.Equal(0, await CountParentNotificationsAsync(parent, ParentNotificationTypes.Attendance));
        }
        finally
        {
            SetModule(_seed.CenterA, ModuleKeys.Attendance, true);
        }
    }

    [Fact]
    public async Task Parent_Not_Notified_After_Link_Removed()
    {
        var (parent, child) = await CreateParentWithChildAsync(_seed.CenterA, "Unlinked Child");

        await RemoveLinkAsync(parent, child);

        await NotifyDirectAsync(child, ParentNotificationTypes.Attendance, ModuleKeys.Attendance);

        Assert.Equal(0, await CountParentNotificationsAsync(parent, ParentNotificationTypes.Attendance));
    }

    // ---------------- exam results ----------------

    [Fact]
    public async Task Published_Exam_Results_Notify_Linked_Parents_Once()
    {
        var (parent, child) = await CreateParentWithChildAsync(_seed.CenterA, "Exam Notify Child");
        await EnrollInGroupAsync(child, _seed.GroupA);
        var (otherParent, _) = await CreateParentWithChildAsync(_seed.CenterA, "Exam Other Child");

        var examId = await SeedElectronicExamAsync(_seed.CenterA, _seed.GroupA, child);

        var publishRoute = Routing.QuestionExamRoute.PublishResults.Replace("{id}", examId.ToString());
        var first = await CenterAdmin().PostAsync(publishRoute, content: null);
        Assert.Equal(HttpStatusCode.OK, first.StatusCode);

        Assert.Equal(1, await CountParentNotificationsAsync(parent, ParentNotificationTypes.ExamResults));
        Assert.Equal(1, await CountParentNotificationsForReferenceAsync(parent, examId));
        Assert.Equal(0, await CountParentNotificationsAsync(otherParent, ParentNotificationTypes.ExamResults));

        // Publishing an already published exam is a no-op and must not duplicate.
        var second = await CenterAdmin().PostAsync(publishRoute, content: null);
        Assert.Equal(HttpStatusCode.OK, second.StatusCode);
        Assert.Equal(1, await CountParentNotificationsAsync(parent, ParentNotificationTypes.ExamResults));
    }

    // ---------------- overdue subscription ----------------

    [Fact]
    public async Task Overdue_Reminder_Notifies_Linked_Parents_Once()
    {
        var (parent, child) = await CreateParentWithChildAsync(_seed.CenterA, "Overdue Child");
        await MakeMonthlyStudentAsync(child);
        await EnrollInGroupAsync(child, _seed.GroupA);

        var (otherParent, otherChild) = await CreateParentWithChildAsync(_seed.CenterA, "Session Child");
        await MakeSessionStudentAsync(otherChild);
        await EnrollInGroupAsync(otherChild, _seed.GroupA);

        await RunOverdueJobAsync();
        await RunOverdueJobAsync();

        Assert.Equal(1, await CountParentNotificationsAsync(parent, ParentNotificationTypes.PaymentOverdue));
        Assert.Equal(0, await CountParentNotificationsAsync(otherParent, ParentNotificationTypes.PaymentOverdue));
    }

    // ---------------- parent notification endpoints ----------------

    [Fact]
    public async Task Parent_Notifications_Are_Scoped_Counted_And_Marked_Read()
    {
        var (parent, child) = await CreateParentWithChildAsync(_seed.CenterA, "Inbox Child");
        var (_, otherChild) = await CreateParentWithChildAsync(_seed.CenterA, "Inbox Other Child");

        var sessionId = SeedSession(_seed.CenterA, _seed.GroupA);
        await SaveAttendanceAsync(CenterAdmin(), sessionId, new DateOnly(2026, 10, 9),
            (child, AttendanceStatus.Absent), (otherChild, AttendanceStatus.Late));

        var parentClient = Client(AppRoles.Parent, isCenterAdmin: false, subjectOverride: parent);

        using var listDoc = await GetAsync(parentClient, Routing.ParentPortalRouting.Notifications);
        var items = listDoc.RootElement.GetProperty("data").GetProperty("data");
        Assert.Equal(1, items.GetArrayLength());
        Assert.Equal(NotificationReference(child), items[0].GetProperty("studentId").GetString());

        var unreadBefore = await GetIntAsync(parentClient, Routing.ParentPortalRouting.UnreadCount);
        Assert.Equal(1, unreadBefore);

        var notificationId = items[0].GetProperty("id").GetString();
        var markRead = await parentClient.PutAsync(
            Routing.ParentPortalRouting.MarkRead.Replace("{id}", notificationId),
            content: null);
        Assert.Equal(HttpStatusCode.OK, markRead.StatusCode);

        Assert.Equal(0, await GetIntAsync(parentClient, Routing.ParentPortalRouting.UnreadCount));

        var markAll = await parentClient.PostAsync(Routing.ParentPortalRouting.MarkAllRead, content: null);
        Assert.Equal(HttpStatusCode.OK, markAll.StatusCode);
    }

    [Fact]
    public async Task Parent_Cannot_Mark_Another_Parents_Notification_Read()
    {
        var (parent1, child1) = await CreateParentWithChildAsync(_seed.CenterA, "Owner Child");
        var (parent2, _) = await CreateParentWithChildAsync(_seed.CenterA, "Intruder Child");

        var sessionId = SeedSession(_seed.CenterA, _seed.GroupA);
        await SaveAttendanceAsync(CenterAdmin(), sessionId, new DateOnly(2026, 10, 10),
            (child1, AttendanceStatus.Absent));

        var notificationId = await FirstNotificationIdAsync(parent1);

        var response = await Client(AppRoles.Parent, isCenterAdmin: false, subjectOverride: parent2)
            .PutAsync(Routing.ParentPortalRouting.MarkRead.Replace("{id}", notificationId), content: null);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Student_Notification_Rows_Never_Appear_In_The_Parent_Inbox()
    {
        var (parent, child) = await CreateParentWithChildAsync(_seed.CenterA, "Mixed Child");

        // A student-style row for the same child (UserId set, ParentUserId null)
        // must stay invisible to the parent portal.
        using (var scope = _factory.Services.CreateScope())
        {
            var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            context.Notifications.Add(new Notification
            {
                UserId = Guid.NewGuid(),
                StudentId = child,
                Title = "Student Only",
                Type = "QuestionExamResultsPublished",
                ReferenceType = nameof(QuestionExam),
                ReferenceId = Guid.NewGuid(),
                CenterId = _seed.CenterA,
                IsRead = false
            });
            await context.SaveChangesAsync();
        }

        var parentClient = Client(AppRoles.Parent, isCenterAdmin: false, subjectOverride: parent);
        Assert.Equal(0, await GetIntAsync(parentClient, Routing.ParentPortalRouting.UnreadCount));

        using var listDoc = await GetAsync(parentClient, Routing.ParentPortalRouting.Notifications);
        Assert.Equal(0, listDoc.RootElement.GetProperty("data").GetProperty("data").GetArrayLength());
    }

    // ---------------- helpers ----------------

    private static string NewPhone()
        => "012" + (Interlocked.Increment(ref _phoneSeed) % 100_000_000).ToString("D8");

    private async Task<(Guid ParentUserId, Guid StudentId)> CreateParentWithChildAsync(Guid centerId, string childName)
    {
        var (parentId, _) = await CreateParentAsync(centerId, $"Parent of {childName}");
        var studentId = await CreateStudentAsync(centerId, childName);
        await LinkAsync(parentId, studentId);

        return (parentId, studentId);
    }

    private async Task<(Guid ParentUserId, string Phone)> CreateParentAsync(Guid centerId, string fullName)
    {
        var phone = NewPhone();
        var parentId = await CreateUserAsync(centerId, fullName, phone, AppRoles.Parent);

        return (parentId, phone);
    }

    private async Task<Guid> CreateUserAsync(Guid centerId, string fullName, string phone, string role)
    {
        using var scope = _factory.Services.CreateScope();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<User>>();

        var user = new User
        {
            Id = Guid.NewGuid(),
            FullName = fullName,
            UserName = phone,
            PhoneNumber = phone,
            EmailConfirmed = true,
            CenterId = centerId
        };

        var result = await userManager.CreateAsync(user);
        Assert.True(result.Succeeded, string.Join("؛ ", result.Errors.Select(e => e.Description)));

        await userManager.AddToRoleAsync(user, role);

        return user.Id;
    }

    private async Task<Guid> CreateStudentAsync(Guid centerId, string fullName)
    {
        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var student = new Student
        {
            Id = Guid.NewGuid(),
            FullName = fullName,
            PhoneNumber = NewPhone(),
            ParentPhoneNumber = NewPhone(),
            CenterId = centerId,
            SubscriptionType = SubscriptionType.Session
        };

        context.Students.Add(student);
        await context.SaveChangesAsync();

        return student.Id;
    }

    private async Task MakeMonthlyStudentAsync(Guid studentId)
    {
        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var student = await context.Students.IgnoreQueryFilters().FirstAsync(s => s.Id == studentId);
        student.SubscriptionType = SubscriptionType.Month;
        await context.SaveChangesAsync();
    }

    private async Task MakeSessionStudentAsync(Guid studentId)
    {
        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var student = await context.Students.IgnoreQueryFilters().FirstAsync(s => s.Id == studentId);
        student.SubscriptionType = SubscriptionType.Session;
        await context.SaveChangesAsync();
    }

    private async Task EnrollInGroupAsync(Guid studentId, Guid groupId)
    {
        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        context.StudentGroups.Add(new StudentGroup
        {
            StudentId = studentId,
            GroupId = groupId,
            CenterId = _seed.CenterA,
            IsActive = true,
            JoinDate = new DateTime(2026, 8, 1)
        });

        await context.SaveChangesAsync();
    }

    private async Task LinkAsync(Guid parentUserId, Guid studentId)
    {
        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        context.ParentStudentLinks.Add(new ParentStudentLink
        {
            ParentUserId = parentUserId,
            StudentId = studentId,
            CenterId = _seed.CenterA
        });

        await context.SaveChangesAsync();
    }

    private async Task RemoveLinkAsync(Guid parentUserId, Guid studentId)
    {
        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        // Mirror what the soft-delete interceptor does when staff unlink a parent.
        var link = await context.ParentStudentLinks
            .IgnoreQueryFilters()
            .FirstAsync(l => l.ParentUserId == parentUserId && l.StudentId == studentId);

        link.IsDeleted = true;
        link.DeletedAt = DateTime.UtcNow;
        await context.SaveChangesAsync();
    }

    private Guid SeedSession(Guid centerId, Guid groupId)
    {
        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var session = new Session
        {
            Id = Guid.NewGuid(),
            GroupId = groupId,
            CenterId = centerId,
            SessionPrice = 0,
            DayOfWeek = DayOfWeek.Saturday,
            StartTime = new TimeOnly(10, 0),
            EndTime = new TimeOnly(12, 0)
        };

        context.Sessions.Add(session);
        context.SaveChanges();

        return session.Id;
    }

    private async Task<Guid> SeedElectronicExamAsync(Guid centerId, Guid groupId, Guid studentId)
    {
        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var year = context.AcademicYears.FirstOrDefault();
        if (year is null)
        {
            year = new AcademicYear { Id = Guid.NewGuid(), Name = "2026", Order = 1 };
            context.AcademicYears.Add(year);
            await context.SaveChangesAsync();
        }

        var examId = Guid.NewGuid();
        context.QuestionExams.Add(new QuestionExam
        {
            Id = examId,
            Name = "Electronic Exam",
            GroupId = groupId,
            AcademicYearId = year.Id,
            Mode = QuestionExamMode.Electronic,
            ExamDate = new DateTime(2026, 10, 20),
            DurationMinutes = 60,
            IsResultsPublished = false,
            CenterId = centerId
        });

        context.StudentExamAttempts.Add(new StudentExamAttempt
        {
            Id = Guid.NewGuid(),
            QuestionExamId = examId,
            StudentId = studentId,
            Status = StudentExamAttemptStatus.Submitted,
            Score = 18,
            TotalMark = 20,
            SubmittedAt = new DateTime(2026, 10, 20, 12, 0, 0),
            CenterId = centerId
        });

        await context.SaveChangesAsync();

        return examId;
    }

    private async Task<HttpResponseMessage> SaveAttendanceAsync(
        HttpClient client,
        Guid sessionId,
        DateOnly date,
        params (Guid StudentId, AttendanceStatus Status)[] items)
    {
        var payload = JsonSerializer.Serialize(new
        {
            sessionId,
            attendanceDate = date.ToString("yyyy-MM-dd"),
            attendances = items.Select(i => new
            {
                studentId = i.StudentId,
                status = (int)i.Status
            })
        });

        return await client.PostAsync(
            Routing.AttendanceRouting.Create,
            new StringContent(payload, Encoding.UTF8, "application/json"));
    }

    private async Task NotifyDirectAsync(Guid studentId, string type, string module)
    {
        using var scope = _factory.Services.CreateScope();
        var notifier = scope.ServiceProvider.GetRequiredService<IParentNotificationService>();

        await notifier.NotifyStudentParentsAsync(
            studentId,
            type,
            module,
            eventReferenceId: Guid.NewGuid(),
            eventReferenceType: "Test",
            title: "t",
            body: "b");
    }

    private async Task RunOverdueJobAsync()
    {
        var service = new ParentOverdueReminderService(
            _factory.Services.GetRequiredService<IServiceScopeFactory>(),
            _factory.Services.GetRequiredService<IConfiguration>(),
            _factory.Services.GetRequiredService<ILogger<ParentOverdueReminderService>>());

        await service.RunOnceAsync(CancellationToken.None);
    }

    private async Task<int> CountParentNotificationsAsync(Guid parentUserId, string type)
    {
        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        return await context.Notifications
            .IgnoreQueryFilters()
            .CountAsync(n => n.ParentUserId == parentUserId && n.Type == type);
    }

    private async Task<int> CountParentNotificationsForReferenceAsync(Guid parentUserId, Guid referenceId)
    {
        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        return await context.Notifications
            .IgnoreQueryFilters()
            .CountAsync(n => n.ParentUserId == parentUserId && n.ReferenceId == referenceId);
    }

    private async Task<string> FirstNotificationIdAsync(Guid parentUserId)
    {
        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        return (await context.Notifications
            .IgnoreQueryFilters()
            .FirstAsync(n => n.ParentUserId == parentUserId)).Id.ToString();
    }

    private static string NotificationReference(Guid studentId) => studentId.ToString();

    private static async Task<JsonDocument> GetAsync(HttpClient client, string route)
    {
        var response = await client.GetAsync(route);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        return JsonDocument.Parse(await response.Content.ReadAsStringAsync());
    }

    private static async Task<int> GetIntAsync(HttpClient client, string route)
    {
        using var doc = await GetAsync(client, route);

        return doc.RootElement.GetProperty("data").GetInt32();
    }

    private void SetModule(Guid centerId, string moduleKey, bool enabled)
    {
        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var row = context.CenterModules
            .IgnoreQueryFilters()
            .FirstOrDefault(m => m.CenterId == centerId && m.ModuleKey == moduleKey);

        if (row is null)
        {
            row = new CenterManagement.Data.Entities.Subscriptions.CenterModule
            {
                CenterId = centerId,
                ModuleKey = moduleKey
            };
            context.CenterModules.Add(row);
        }

        row.IsEnabled = enabled;
        row.IsDeleted = false;
        context.SaveChanges();

        scope.ServiceProvider.GetRequiredService<ICenterModuleService>().Invalidate(centerId);
    }

    private HttpClient CenterAdmin()
        => Client(AppRoles.Teacher, isCenterAdmin: true);

    private HttpClient Client(string role, bool isCenterAdmin, Guid? centerOverride = null, Guid? subjectOverride = null)
    {
        var client = _factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            BaseAddress = new Uri("https://localhost"),
            AllowAutoRedirect = false
        });

        var subject = subjectOverride ?? (role == AppRoles.Teacher ? _seed.TeacherA : _seed.CenterOwnerA);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(
            "Bearer",
            CreateToken(subject, role, centerOverride ?? _seed.CenterA, isCenterAdmin));

        return client;
    }

    private static string CreateToken(Guid userId, string role, Guid centerId, bool isCenterAdmin)
    {
        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, userId.ToString()),
            new Claim("Id", userId.ToString()),
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

using System.Net;
using System.Net.Http.Json;
using CenterManagement.Core.Bases;
using CenterManagement.Core.Features.UsersFeature.Students.Commands.Models.Import;
using CenterManagement.Core.Features.UsersFeature.Students.Services;
using CenterManagement.Data.AppMetaData;
using CenterManagement.Data.Entities.Groups;
using CenterManagement.Data.Entities.Users;
using CenterManagement.Infrustructure.Data;
using CenterManagement.Infrustructure.InfrastructureBases.Bases;
using ClosedXML.Excel;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace CenterManagement.Tests;

public sealed class StudentImportCommitTests : IDisposable
{
    private readonly ScopeApiFactory _factory;
    private readonly SeedResult _seed;

    public StudentImportCommitTests()
    {
        _factory = new ScopeApiFactory();
        _seed = _factory.EnsureSeeded();
    }

    public void Dispose() => _factory.Dispose();

    private HttpClient Owner() =>
        SecurityTestSupport.CenterAdminClient(_factory, _seed.CenterOwnerA, _seed.CenterA);

    private HttpClient Teacher() =>
        SecurityTestSupport.Client(_factory, _seed.TeacherA, AppRoles.Teacher, _seed.CenterA);

    private HttpClient Assistant() =>
        SecurityTestSupport.Client(_factory, _seed.AssistantA, AppRoles.Assistant, _seed.CenterA);

    private static byte[] CreateXlsx(params (string Name, string Phone, string Parent, string Group)[] rows)
    {
        using var wb = new XLWorkbook();
        var ws = wb.Worksheets.Add("الطلاب");
        ws.Cell(1, 1).Value = "الاسم الكامل";
        ws.Cell(1, 2).Value = "رقم الهاتف";
        ws.Cell(1, 3).Value = "رقم هاتف ولي الأمر";
        ws.Cell(1, 4).Value = "اسم المجموعة";
        ws.Cell(1, 5).Value = "نوع الاشتراك";
        ws.Cell(1, 6).Value = "سعر مخصص";
        ws.Cell(1, 7).Value = "المدرسة";
        ws.Cell(1, 8).Value = "ملاحظات";

        var row = 2;
        foreach (var item in rows)
        {
            ws.Cell(row, 1).Value = item.Name;
            ws.Cell(row, 2).Value = item.Phone;
            ws.Cell(row, 3).Value = item.Parent;
            ws.Cell(row, 4).Value = item.Group;
            row++;
        }

        using var ms = new MemoryStream();
        wb.SaveAs(ms);
        return ms.ToArray();
    }

    private static async Task<StudentImportPreviewResult> Preview(HttpClient client, params (string Name, string Phone, string Parent, string Group)[] rows)
    {
        using var content = new MultipartFormDataContent();
        var bytes = CreateXlsx(rows);
        var byteContent = new ByteArrayContent(bytes);
        byteContent.Headers.ContentType =
            new System.Net.Http.Headers.MediaTypeHeaderValue(
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        content.Add(byteContent, "File", "students.xlsx");

        var response = await client.PostAsync(Routing.StudentRouting.ImportPreview, content);
        var body = await response.Content.ReadAsStringAsync();
        var payload = System.Text.Json.JsonSerializer.Deserialize<Response<StudentImportPreviewResult>>(
            body,
            new System.Text.Json.JsonSerializerOptions { PropertyNameCaseInsensitive = true });
        Assert.NotNull(payload);
        Assert.True(payload!.Succeeded, body);
        return payload.Data;
    }

    private static async Task<Response<StudentImportCommitResult>> Commit(HttpClient client, string sessionId, CommitStudentImportCommand? command = null)
    {
        command ??= new CommitStudentImportCommand { SessionId = sessionId };
        command.SessionId = sessionId;

        var response = await client.PostAsJsonAsync(Routing.StudentRouting.ImportCommit, command);
        var body = await response.Content.ReadAsStringAsync();
        var payload = System.Text.Json.JsonSerializer.Deserialize<Response<StudentImportCommitResult>>(
            body,
            new System.Text.Json.JsonSerializerOptions { PropertyNameCaseInsensitive = true });
        Assert.NotNull(payload);
        return payload!;
    }

    [Fact]
    public async Task Commit_Full_Success_Creates_Students_And_Accounts()
    {
        var preview = await Preview(Owner(),
            ("طالب تجريبي أ", "01066666661", "01077777771", "Group A"),
            ("طالب تجريبي ب", "01066666662", "01077777772", "Group A"));

        var result = await Commit(Owner(), preview.SessionId);
        Assert.True(result.Succeeded);
        Assert.Equal(2, result.Data.Created);
        Assert.Equal(0, result.Data.Failed);

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var userManager = scope.ServiceProvider.GetRequiredService<Microsoft.AspNetCore.Identity.UserManager<CenterManagement.Data.Entities.Identity.User>>();

        var student = await db.Students.FirstAsync(s => s.PhoneNumber == "01066666661");
        Assert.NotNull(student.UserId);

        var user = await userManager.FindByIdAsync(student.UserId!.Value.ToString());
        Assert.NotNull(user);
        Assert.Equal("01066666661", user!.UserName);
        Assert.True(await userManager.CheckPasswordAsync(user, "01066666661"));
        Assert.True(user.MustChangePassword);
    }

    [Fact]
    public async Task Commit_Partial_Success_Returns_Failed_Rows_Report()
    {
        var preview = await Preview(Owner(),
            ("صالح", "01066666681", "01077777781", "Group A"),
            ("غير صالح", "bad-phone", "01077777782", "Group A"),
            ("صالح2", "01066666683", "bad-parent", "Group A"));

        var result = await Commit(Owner(), preview.SessionId);
        Assert.True(result.Succeeded);
        Assert.Equal(1, result.Data.Created);
        Assert.True(result.Data.Failed >= 2);
        Assert.Contains(result.Data.Errors, e => e.RowNumber > 0);

        var report = await Owner().GetAsync(
            Routing.StudentRouting.ImportErrorsReport.Replace("{sessionId}", preview.SessionId));
        Assert.Equal(HttpStatusCode.OK, report.StatusCode);
        Assert.Contains("spreadsheetml", report.Content.Headers.ContentType?.MediaType);
    }

    [Fact]
    public async Task Commit_Skip_Vs_Update_Duplicate_Mode()
    {
        var previewSkip = await Preview(Owner(),
            ("محدث", "01200000001", "01200000011", "Group A"));
        var skipResult = await Commit(Owner(), previewSkip.SessionId,
            new CommitStudentImportCommand { SessionId = previewSkip.SessionId, DuplicateMode = "skip" });
        Assert.True(skipResult.Succeeded);
        Assert.Equal(0, skipResult.Data.Created);
        Assert.True(skipResult.Data.Skipped >= 1);

        var previewUpdate = await Preview(Owner(),
            ("طالب أ محدث", "01200000002", "01200000012", "Group B"));
        var updateResult = await Commit(Owner(), previewUpdate.SessionId,
            new CommitStudentImportCommand { SessionId = previewUpdate.SessionId, DuplicateMode = "update" });
        Assert.True(updateResult.Succeeded);
        Assert.True(updateResult.Data.Updated >= 1);
    }

    [Fact]
    public async Task Commit_Creates_Missing_Groups_When_Enabled_Else_Fails()
    {
        var preview = await Preview(Owner(),
            ("طالب", "01066666701", "01077777801", "مجموعة جديدة للاستيراد"));

        var disabled = await Commit(Owner(), preview.SessionId,
            new CommitStudentImportCommand { SessionId = preview.SessionId, CreateMissingGroups = false });
        Assert.True(disabled.Succeeded);
        Assert.Equal(0, disabled.Data.Created);
        Assert.True(disabled.Data.Failed >= 1);
        Assert.Empty(disabled.Data.CreatedGroups);

        var preview2 = await Preview(Owner(),
            ("طالب", "01066666702", "01077777802", "مجموعة جديدة للاستيراد 2"));

        var enabled = await Commit(Owner(), preview2.SessionId,
            new CommitStudentImportCommand { SessionId = preview2.SessionId, CreateMissingGroups = true });
        Assert.True(enabled.Succeeded);
        Assert.True(enabled.Data.Created >= 1);
        Assert.Contains(enabled.Data.CreatedGroups, g => g.Contains("مجموعة جديدة للاستيراد"));
    }

    [Fact]
    public async Task Commit_Rejects_Whole_File_When_Center_Subscription_Blocked()
    {
        var preview = await Preview(Owner(),
            ("طالب", "01066666711", "01077777811", "Group A"),
            ("طالب ب", "01066666712", "01077777812", "Group A"));

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var center = await db.Centers.FirstAsync(c => c.Id == _seed.CenterA);
            center.Status = CenterManagement.Data.Enums.CenterStatus.Suspended;
            await db.SaveChangesAsync();
        }

        var result = await Commit(Owner(), preview.SessionId);

        Assert.False(result.Succeeded);
        Assert.True(
            (result.Message ?? string.Empty).Contains("اشتراك") ||
            (result.Message ?? string.Empty).Contains("المركز"),
            result.Message);

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            Assert.False(await db.Students.AnyAsync(s => s.PhoneNumber == "01066666711"));
            Assert.False(await db.Students.AnyAsync(s => s.PhoneNumber == "01066666712"));

            var center = await db.Centers.FirstAsync(c => c.Id == _seed.CenterA);
            center.Status = CenterManagement.Data.Enums.CenterStatus.Active;
            await db.SaveChangesAsync();
        }
    }

    [Fact]
    public async Task Commit_Double_Execution_Is_Prevented_And_Second_Returns_Cached_Result()
    {
        var preview = await Preview(Owner(),
            ("طالب", "01066666721", "01077777821", "Group A"));

        var first = Commit(Owner(), preview.SessionId);
        var second = Commit(Owner(), preview.SessionId);

        var results = await Task.WhenAll(first, second);
        var ok = results.Count(r => r.Succeeded);
        var blocked = results.Count(r => !r.Succeeded);

        Assert.True(ok >= 1);
        Assert.True(blocked >= 1);

        var firstCreated = results.First(r => r.Succeeded).Data.Created;

        // A repeat after completion returns the cached result instead of running again.
        var repeat = await Commit(Owner(), preview.SessionId);
        Assert.True(repeat.Succeeded);
        Assert.True(repeat.Data.AlreadyCompleted);
        Assert.Equal(firstCreated, repeat.Data.Created);

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        Assert.Equal(1, await db.Students.CountAsync(s => s.PhoneNumber == "01066666721"));
    }

    [Fact]
    public async Task Commit_Same_Parent_Phone_Reused_For_Different_Students()
    {
        var parent = "01077777901";
        var preview = await Preview(Owner(),
            ("طالب أ", "01066666731", parent, "Group A"),
            ("طالب ب", "01066666732", parent, "Group A"));

        var result = await Commit(Owner(), preview.SessionId);
        Assert.True(result.Succeeded);
        Assert.Equal(2, result.Data.Created);

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var userManager = scope.ServiceProvider.GetRequiredService<Microsoft.AspNetCore.Identity.UserManager<CenterManagement.Data.Entities.Identity.User>>();

        var parentUsers = await userManager.Users.Where(u => u.PhoneNumber == parent).ToListAsync();
        Assert.True(parentUsers.Count >= 1);
    }

    [Fact]
    public async Task Preview_And_Commit_Duplicate_Phone_From_Other_Teacher_Group_Is_General_Error()
    {
        // Student B (phone 01200000002) belongs to Group B, taught by Teacher B.
        // Teacher A may only target Group A, so he must see a generic duplicate
        // with no "update" option and no student/group details.
        var preview = await Preview(Teacher(),
            ("مهاجم", "01200000002", "01088888881", "Group A"));

        var row = preview.Rows[0];
        Assert.False(row.IsValid);
        Assert.True(row.IsDuplicateInDb);
        Assert.False(row.CanUpdate);
        var errors = string.Join(" ", row.Errors);
        Assert.DoesNotContain("Student B", errors);
        Assert.DoesNotContain("Group B", errors);
        Assert.DoesNotContain("Teacher", errors);
        Assert.DoesNotContain("01200000002", errors);

        var preview2 = await Preview(Teacher(),
            ("مهاجم", "01200000002", "01088888881", "Group A"));
        var commit = await Commit(Teacher(), preview2.SessionId,
            new CommitStudentImportCommand
            {
                SessionId = preview2.SessionId,
                DuplicateMode = "update"
            });
        Assert.True(commit.Succeeded);
        Assert.Equal(0, commit.Data.Updated);
        Assert.True(commit.Data.Failed >= 1);
        var commitErrors = string.Join(" ", commit.Data.Errors.Select(e => e.Reason));
        Assert.DoesNotContain("Student B", commitErrors);
        Assert.DoesNotContain("Group B", commitErrors);
        Assert.DoesNotContain("01200000002", commitErrors);

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var student = await db.Students.FirstAsync(s => s.PhoneNumber == "01200000002");
        Assert.Equal("Student B", student.FullName);
    }

    [Fact]
    public async Task Commit_Update_Changes_Only_Name_And_Contact_Fields()
    {
        var joinDate = new DateTime(2026, 8, 1);

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var student = await db.Students
                .Include(s => s.StudentGroups)
                .FirstAsync(s => s.PhoneNumber == "01200000002");

            student.SubscriptionType = CenterManagement.Data.Enums.SubscriptionType.Session;
            student.CustomMonthlyPrice = 77m;
            student.IsPaid = true;
            student.School = "مدرسة قديمة";
            student.Notes = "ملاحظة قديمة";
            await db.SaveChangesAsync();
        }

        var preview = await Preview(Owner(),
            ("اسم محدث", "01200000002", "01077777001", "Group A"));

        var result = await Commit(Owner(), preview.SessionId,
            new CommitStudentImportCommand
            {
                SessionId = preview.SessionId,
                DuplicateMode = "update"
            });

        Assert.True(result.Succeeded);
        Assert.Equal(1, result.Data.Updated);
        Assert.Equal(0, result.Data.Created);

        using var verifyScope = _factory.Services.CreateScope();
        var verifyDb = verifyScope.ServiceProvider.GetRequiredService<AppDbContext>();
        var updated = await verifyDb.Students
            .Include(s => s.StudentGroups)
            .FirstAsync(s => s.PhoneNumber == "01200000002");

        Assert.Equal("اسم محدث", updated.FullName);
        Assert.Equal("01077777001", updated.ParentPhoneNumber);
        Assert.Equal("01200000002", updated.PhoneNumber);

        // Everything else must stay untouched.
        Assert.Equal(CenterManagement.Data.Enums.SubscriptionType.Session, updated.SubscriptionType);
        Assert.Equal(77m, updated.CustomMonthlyPrice);
        Assert.True(updated.IsPaid);
        Assert.True(updated.IsActive);
        Assert.Equal("مدرسة قديمة", updated.School);
        Assert.Equal("ملاحظة قديمة", updated.Notes);

        var active = updated.StudentGroups.Where(sg => sg.IsActive && sg.LeftAt == null).ToList();
        Assert.True(active.Count >= 1);
        var membership = active.First(sg => sg.GroupId == _seed.GroupB);
        Assert.Equal(joinDate, membership.JoinDate);
        Assert.True(membership.IsActive);
        Assert.Null(membership.LeftAt);
    }

    [Fact]
    public async Task Commit_Phone_Of_Another_Role_Fails_Only_That_Row()
    {
        var preview = await Preview(Owner(),
            ("هاتف مدرس", "01100000001", "01077777011", "Group A"),
            ("طالب سليم", "01066666801", "01077777012", "Group A"));

        Assert.False(preview.Rows[0].IsValid);
        Assert.True(preview.Rows[1].IsValid);

        var result = await Commit(Owner(), preview.SessionId);

        Assert.True(result.Succeeded);
        Assert.Equal(1, result.Data.Created);
        Assert.Equal(1, result.Data.Failed);

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        Assert.False(await db.Students.AnyAsync(s => s.PhoneNumber == "01100000001"));
        Assert.True(await db.Students.AnyAsync(s => s.PhoneNumber == "01066666801"));
    }

    [Fact]
    public async Task Commit_Out_Of_Scope_Group_Fails_For_Teacher_And_Assistant()
    {
        var teacherPreview = await Preview(Teacher(),
            ("طالب مدرس", "01066666811", "01077777021", "Group B"));
        Assert.False(teacherPreview.Rows[0].IsValid);

        var teacherCommit = await Commit(Teacher(), teacherPreview.SessionId);
        Assert.True(teacherCommit.Succeeded);
        Assert.Equal(0, teacherCommit.Data.Created);
        Assert.Equal(1, teacherCommit.Data.Failed);

        var assistantPreview = await Preview(Assistant(),
            ("طالب مساعد", "01066666812", "01077777022", "Group B"));
        Assert.False(assistantPreview.Rows[0].IsValid);

        var assistantCommit = await Commit(Assistant(), assistantPreview.SessionId);
        Assert.True(assistantCommit.Succeeded);
        Assert.Equal(0, assistantCommit.Data.Created);
        Assert.Equal(1, assistantCommit.Data.Failed);

        // Sanity: the same teacher can still create inside his own group.
        var ownPreview = await Preview(Teacher(),
            ("طالب نطاقي", "01066666813", "01077777023", "Group A"));
        var ownCommit = await Commit(Teacher(), ownPreview.SessionId);
        Assert.True(ownCommit.Succeeded);
        Assert.Equal(1, ownCommit.Data.Created);

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        Assert.False(await db.Students.AnyAsync(s => s.PhoneNumber == "01066666811"));
        Assert.False(await db.Students.AnyAsync(s => s.PhoneNumber == "01066666812"));
        Assert.True(await db.Students.AnyAsync(s => s.PhoneNumber == "01066666813"));
    }

    [Fact]
    public async Task Commit_Is_Isolated_By_Center_And_Session_Owner()
    {
        Guid groupBId;
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var group = new Group
            {
                Name = "Group B Center",
                CenterId = _seed.CenterB,
                MonthlyPrice = 100,
                SessionsPerMonth = 8
            };
            db.Groups.Add(group);
            await db.SaveChangesAsync();
            groupBId = group.Id;
        }

        var centerBUser = SecurityTestSupport.Client(
            _factory, _seed.AssistantB, AppRoles.Assistant, _seed.CenterB);

        // Same phone already exists in Center A: phones are unique per center only.
        var preview = await Preview(centerBUser,
            ("طالب مركز ب", "01200000001", "01200000011", "Group B Center"));

        var result = await Commit(centerBUser, preview.SessionId);
        Assert.True(result.Succeeded);
        Assert.Equal(1, result.Data.Created);

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            var created = await db.Students
                .FirstAsync(s => s.CenterId == _seed.CenterB && s.PhoneNumber == "01200000001");
            Assert.Equal(groupBId, (await db.StudentGroups
                .FirstAsync(sg => sg.StudentId == created.Id)).GroupId);

            var untouched = await db.Students.FirstAsync(s => s.Id == _seed.StudentA);
            Assert.Equal("Student A", untouched.FullName);
            Assert.Equal(_seed.CenterA, untouched.CenterId);
        }

        // A session belongs to the user+center that created it.
        var previewA = await Preview(Owner(),
            ("طالب", "01066666821", "01077777031", "Group A"));
        var crossCommit = await Commit(centerBUser, previewA.SessionId);
        Assert.False(crossCommit.Succeeded);

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            Assert.False(await db.Students.AnyAsync(s => s.PhoneNumber == "01066666821"));
        }
    }

    [Fact]
    public async Task Commit_Errors_Report_Is_Excel_And_Scoped_To_User_And_Center()
    {
        var preview = await Preview(Owner(),
            ("صالح", "01066666831", "01077777041", "Group A"),
            ("غير صالح", "bad-phone", "01077777042", "Group A"),
            ("غير صالح 2", "01066666833", "bad-parent", "Group A"));

        var result = await Commit(Owner(), preview.SessionId);
        Assert.True(result.Succeeded);
        Assert.Equal(1, result.Data.Created);
        Assert.Equal(2, result.Data.Failed);

        var route = Routing.StudentRouting.ImportErrorsReport
            .Replace("{sessionId}", preview.SessionId);

        var report = await Owner().GetAsync(route);
        Assert.Equal(HttpStatusCode.OK, report.StatusCode);
        Assert.Contains("spreadsheetml", report.Content.Headers.ContentType?.MediaType);

        using var workbook = new XLWorkbook(
            new MemoryStream(await report.Content.ReadAsByteArrayAsync()));
        var ws = workbook.Worksheet(1);
        Assert.Equal("أخطاء الاستيراد", ws.Name);
        Assert.Equal("رقم الصف", ws.Cell(1, 1).GetString());
        Assert.Equal("الاسم", ws.Cell(1, 2).GetString());
        Assert.Equal("السبب", ws.Cell(1, 3).GetString());

        var reportRows = ws.RangeUsed()!.RowsUsed().Skip(1).ToList();
        Assert.Equal(result.Data.Errors.Count, reportRows.Count);
        Assert.All(reportRows, row => Assert.False(string.IsNullOrWhiteSpace(row.Cell(3).GetString())));

        // Another user in the same center cannot download it.
        var sameCenter = await Teacher().GetAsync(route);
        Assert.False(sameCenter.IsSuccessStatusCode);

        // Nor can a user from another center.
        var centerBUser = SecurityTestSupport.Client(
            _factory, _seed.AssistantB, AppRoles.Assistant, _seed.CenterB);
        var otherCenter = await centerBUser.GetAsync(route);
        Assert.False(otherCenter.IsSuccessStatusCode);
    }

    [Fact]
    public async Task Commit_Batch_Failure_Does_Not_Roll_Back_Previous_Batches()
    {
        using var factory = new FlakyCreationFactory();
        var seed = factory.EnsureSeeded();
        var client = SecurityTestSupport.CenterAdminClient(
            factory, seed.CenterOwnerA, seed.CenterA);

        // 100 rows succeed in the first transaction, row 101 throws mid-batch.
        var rows = Enumerable.Range(1, 101)
            .Select(i => (
                Name: i == 101 ? "BATCHFAIL" : $"طالب دفعة {i}",
                Phone: "01099" + i.ToString("D6"),
                Parent: "01199" + i.ToString("D6"),
                Group: "Group A"))
            .ToArray();

        var preview = await Preview(client, rows);
        var result = await Commit(client, preview.SessionId,
            new CommitStudentImportCommand
            {
                SessionId = preview.SessionId,
                CreateStudentAccounts = false,
                CreateParentAccounts = false
            });

        Assert.True(result.Succeeded);
        Assert.Equal(100, result.Data.Created);
        Assert.Equal(1, result.Data.Failed);
        Assert.Contains(result.Data.Errors, e => e.RowNumber == 102);

        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        Assert.Equal(100, await db.Students.CountAsync(s => s.PhoneNumber.StartsWith("01099")));
        Assert.False(await db.Students.AnyAsync(s => s.FullName == "BATCHFAIL"));
    }

    private sealed class FlakyCreationFactory : ScopeApiFactory
    {
        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            base.ConfigureWebHost(builder);

            builder.ConfigureTestServices(services =>
            {
                foreach (var descriptor in services
                             .Where(d => d.ServiceType == typeof(IStudentCreationService))
                             .ToList())
                {
                    services.Remove(descriptor);
                }

                services.AddScoped<IStudentCreationService, FlakyCreationService>();
            });
        }
    }

    public sealed class FlakyCreationService : IStudentCreationService
    {
        private readonly StudentCreationService _inner;

        public FlakyCreationService(IRepositoryManager repositoryManager)
        {
            _inner = new StudentCreationService(repositoryManager);
        }

        public Task<string> GenerateUniqueQrCodeAsync(CancellationToken cancellationToken = default) =>
            _inner.GenerateUniqueQrCodeAsync(cancellationToken);

        public Task<Student> CreateStudentAsync(
            CreateStudentInput input,
            CancellationToken cancellationToken = default)
        {
            if (input.FullName.Contains("BATCHFAIL", StringComparison.OrdinalIgnoreCase))
                throw new InvalidOperationException("simulated database failure");

            return _inner.CreateStudentAsync(input, cancellationToken);
        }

        public Task<StudentAdditionCheck> EnsureCanAddStudents(
            Guid centerId,
            int newCount,
            CancellationToken cancellationToken = default) =>
            _inner.EnsureCanAddStudents(centerId, newCount, cancellationToken);
    }
}

using System.Net;
using System.Net.Http.Json;
using CenterManagement.Core.Bases;
using CenterManagement.Core.Features.UsersFeature.Students.Commands.Models.Import;
using CenterManagement.Core.Features.UsersFeature.Students.Services;
using CenterManagement.Data.AppMetaData;
using CenterManagement.Infrustructure.Data;
using ClosedXML.Excel;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace CenterManagement.Tests;

/// <summary>
/// Preview + template coverage for the student Excel import.
/// Each test owns its SQLite-backed host so the seeded rows stay deterministic.
/// </summary>
public sealed class StudentImportPreviewTests : IDisposable
{
    private readonly ScopeApiFactory _factory;
    private readonly SeedResult _seed;

    public StudentImportPreviewTests()
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

    private static async Task<Response<StudentImportPreviewResult>> Preview(
        HttpClient client, byte[] bytes, string fileName = "students.xlsx")
    {
        using var content = new MultipartFormDataContent();
        var byteContent = new ByteArrayContent(bytes);
        byteContent.Headers.ContentType =
            new System.Net.Http.Headers.MediaTypeHeaderValue(
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        content.Add(byteContent, "File", fileName);

        var response = await client.PostAsync(Routing.StudentRouting.ImportPreview, content);
        var body = await response.Content.ReadAsStringAsync();

        var payload = System.Text.Json.JsonSerializer.Deserialize<Response<StudentImportPreviewResult>>(
            body,
            new System.Text.Json.JsonSerializerOptions { PropertyNameCaseInsensitive = true });
        Assert.NotNull(payload);
        return payload!;
    }

    [Fact]
    public async Task Template_Contains_Columns_And_Scoped_Groups_List()
    {
        var response = await Owner().GetAsync(Routing.StudentRouting.ImportTemplate);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var stream = new MemoryStream(await response.Content.ReadAsByteArrayAsync());
        using var wb = new XLWorkbook(stream);

        var students = wb.Worksheet("الطلاب");
        Assert.Equal("الاسم الكامل", students.Cell(1, 1).GetString());
        Assert.Equal("رقم الهاتف", students.Cell(1, 2).GetString());
        Assert.Equal("رقم هاتف ولي الأمر", students.Cell(1, 3).GetString());
        Assert.Equal("اسم المجموعة", students.Cell(1, 4).GetString());

        var groups = wb.Worksheet("المجموعات");
        var names = Enumerable.Range(2, 10)
            .Select(r => groups.Cell(r, 1).GetString())
            .Where(n => !string.IsNullOrWhiteSpace(n))
            .ToList();
        Assert.Contains("Group A", names);
        Assert.Contains("Group B", names);
    }

    [Fact]
    public async Task Template_For_Teacher_Only_Lists_His_Groups()
    {
        var response = await Teacher().GetAsync(Routing.StudentRouting.ImportTemplate);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var stream = new MemoryStream(await response.Content.ReadAsByteArrayAsync());
        using var wb = new XLWorkbook(stream);

        var groups = wb.Worksheet("المجموعات");
        var names = Enumerable.Range(2, 10)
            .Select(r => groups.Cell(r, 1).GetString())
            .Where(n => !string.IsNullOrWhiteSpace(n))
            .ToList();
        Assert.Contains("Group A", names);
        Assert.DoesNotContain("Group B", names);
    }

    [Fact]
    public async Task Preview_Valid_Row_Is_Valid()
    {
        var result = await Preview(Owner(), CreateXlsx(
            ("محمد علي", "01012345678", "01098765432", "Group A")));

        Assert.True(result.Succeeded);
        Assert.Equal(1, result.Data.TotalRows);
        Assert.Equal(1, result.Data.ValidRows);
        Assert.True(result.Data.Rows[0].IsValid);
        Assert.False(string.IsNullOrWhiteSpace(result.Data.SessionId));
    }

    [Fact]
    public async Task Preview_Normalizes_All_Supported_Phone_Formats()
    {
        var result = await Preview(Owner(), CreateXlsx(
            ("أحمد", "010 1234 5678", "+201098765432", "Group A"),
            ("محمود", "00201011111111", "20 102 222 2222", "Group A"),
            ("سعيد", "٠١٠٩٩٩٩٩٩٩٩", "(010) 8888-7777", "Group A")));

        Assert.True(result.Succeeded);
        Assert.Equal(3, result.Data.ValidRows);
        Assert.All(result.Data.Rows, r => Assert.True(r.IsValid, string.Join(";", r.Errors)));
        Assert.Equal("01012345678", result.Data.Rows[0].PhoneNormalized);
        Assert.Equal("01098765432", result.Data.Rows[0].PhoneParentNormalized);
        Assert.Equal("01011111111", result.Data.Rows[1].PhoneNormalized);
        Assert.Equal("01022222222", result.Data.Rows[1].PhoneParentNormalized);
        Assert.Equal("01099999999", result.Data.Rows[2].PhoneNormalized);
        Assert.Equal("01088887777", result.Data.Rows[2].PhoneParentNormalized);
    }

    [Fact]
    public async Task Preview_Missing_And_Invalid_Values_Are_Errors()
    {
        var result = await Preview(Owner(), CreateXlsx(
            ("", "01012345678", "01098765432", "Group A"),
            ("اسم", "abc", "01098765432", "Group A"),
            ("اسم", "01012345679", "لا يوجد", "Group A"),
            ("اسم", "01012345670", "01098765430", "")));

        Assert.True(result.Succeeded);
        Assert.Equal(0, result.Data.ValidRows);
        Assert.Equal(4, result.Data.ErrorRows);
    }

    [Fact]
    public async Task Preview_Duplicate_In_File_Is_Flagged_With_Different_Format()
    {
        var result = await Preview(Owner(), CreateXlsx(
            ("أحمد", "01012345678", "01098765432", "Group A"),
            ("محمد", "+201012345678", "01098765433", "Group A")));

        Assert.True(result.Succeeded);
        Assert.Equal(1, result.Data.DuplicateInFile);
        Assert.False(result.Data.Rows[1].IsValid);
    }

    [Fact]
    public async Task Preview_Duplicate_In_Db_Matches_Legacy_Unnormalized_Format()
    {
        var result = await Preview(Owner(), CreateXlsx(
            ("طالب", "201200000001", "01000000001", "Group A")));

        Assert.True(result.Succeeded);
        Assert.Equal(1, result.Data.DuplicateInDb);
        Assert.False(result.Data.Rows[0].IsValid);
        Assert.True(result.Data.Rows[0].CanUpdate);
    }

    [Fact]
    public async Task Preview_Duplicate_Outside_Scope_Is_Generic_And_Cannot_Be_Updated()
    {
        // Student B (01200000002) sits in Group B, outside Teacher A's scope.
        var result = await Preview(Teacher(), CreateXlsx(
            ("طالب", "01200000002", "01055555572", "Group A")));

        Assert.True(result.Succeeded);
        var row = result.Data.Rows[0];
        Assert.False(row.IsValid);
        Assert.True(row.IsDuplicateInDb);
        Assert.False(row.CanUpdate);

        var errors = string.Join(" ", row.Errors);
        Assert.DoesNotContain("Student B", errors);
        Assert.DoesNotContain("Group B", errors);
        Assert.DoesNotContain("01200000002", errors);
    }

    [Fact]
    public async Task Preview_Unknown_Group_Is_Created_For_Center_Wide_User()
    {
        var result = await Preview(Owner(), CreateXlsx(
            ("طالب جديد", "01055555551", "01055555552", "مجموعة جديدة")));

        Assert.True(result.Succeeded);
        Assert.True(result.Data.Rows[0].IsValid);
        Assert.True(result.Data.Rows[0].GroupWillBeCreated);
    }

    [Fact]
    public async Task Preview_Never_Writes_To_The_Database()
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var studentsBefore = await db.Students.CountAsync();
        var groupsBefore = await db.Groups.CountAsync();
        var usersBefore = await db.Users.CountAsync();
        var membershipsBefore = await db.StudentGroups.CountAsync();

        const string newGroup = "مجموعة لا يجب إنشاؤها في المعاينة";
        var result = await Preview(Owner(), CreateXlsx(
            ("طالب جديد", "01055555581", "01055555582", newGroup),
            ("طالب موجود", "01200000001", "01055555583", "Group A")));

        Assert.True(result.Succeeded);
        Assert.True(result.Data.Rows[0].GroupWillBeCreated);

        Assert.Equal(studentsBefore, await db.Students.CountAsync());
        Assert.Equal(groupsBefore, await db.Groups.CountAsync());
        Assert.Equal(usersBefore, await db.Users.CountAsync());
        Assert.Equal(membershipsBefore, await db.StudentGroups.CountAsync());
        Assert.False(await db.Groups.AnyAsync(g => g.Name == newGroup));
    }

    [Fact]
    public async Task Preview_Phone_Of_Another_Role_Is_A_General_Duplicate()
    {
        // 01100000001 belongs to Teacher A, not to a student.
        var result = await Preview(Owner(), CreateXlsx(
            ("طالب", "01100000001", "01055555591", "Group A")));

        Assert.True(result.Succeeded);
        var row = result.Data.Rows[0];
        Assert.False(row.IsValid);
        Assert.True(row.IsDuplicateInDb);
        Assert.False(row.CanUpdate);

        var errors = string.Join(" ", row.Errors);
        Assert.DoesNotContain("Teacher", errors);
        Assert.DoesNotContain("01100000001", errors);
    }

    [Fact]
    public async Task Preview_Group_Outside_Scope_Is_Error_For_Teacher()
    {
        var result = await Preview(Teacher(), CreateXlsx(
            ("طالب", "01055555561", "01055555562", "Group B")));

        Assert.True(result.Succeeded);
        Assert.False(result.Data.Rows[0].IsValid);
        Assert.False(result.Data.Rows[0].GroupWillBeCreated);
    }

    [Fact]
    public async Task Preview_In_Scope_Group_Is_Valid_For_Linked_Assistant()
    {
        var result = await Preview(Assistant(), CreateXlsx(
            ("طالب", "01055555571", "01055555572", "Group A")));

        Assert.True(result.Succeeded);
        Assert.True(result.Data.Rows[0].IsValid);

        var other = await Preview(Assistant(), CreateXlsx(
            ("طالب", "01055555573", "01055555574", "Group B")));

        Assert.False(other.Data.Rows[0].IsValid);
    }

    [Fact]
    public async Task Preview_Rejects_Non_Xlsx_And_Corrupt_And_Bad_Magic_Files()
    {
        var wrongExtension = await Preview(
            Owner(), CreateXlsx(("a", "01011111111", "01022222222", "Group A")), "students.csv");
        Assert.False(wrongExtension.Succeeded);

        var badMagic = await Preview(Owner(), [0x00, 0x01, 0x02, 0x03]);
        Assert.False(badMagic.Succeeded);

        var corrupt = await Preview(Owner(), [0x50, 0x4B, 0x03, 0x04]);
        Assert.False(corrupt.Succeeded);

        var empty = await Preview(Owner(), Array.Empty<byte>());
        Assert.False(empty.Succeeded);
    }

    [Fact]
    public async Task Preview_Rejects_More_Than_2000_Rows()
    {
        var rows = Enumerable.Range(0, 2001)
            .Select(i => ($"طالب{i}", $"010{70000000 + i:D8}"[..11], $"010{80000000 + i:D8}"[..11], "Group A"))
            .ToArray();

        var result = await Preview(Owner(), CreateXlsx(rows));
        Assert.False(result.Succeeded);
    }

    [Fact]
    public async Task Session_Is_Isolated_By_User_And_Center_And_Expires()
    {
        var preview = await Preview(Owner(), CreateXlsx(
            ("طالب", "01055555581", "01055555582", "Group A")));
        Assert.True(preview.Succeeded);

        var otherCenter = SecurityTestSupport.Client(
            _factory, _seed.CenterOwnerA, AppRoles.CenterOwner, _seed.CenterB);

        var wrongCenter = await otherCenter.PostAsJsonAsync(
            Routing.StudentRouting.ImportCommit,
            new CommitStudentImportCommand { SessionId = preview.Data.SessionId });
        var wrongCenterPayload =
            await wrongCenter.Content.ReadFromJsonAsync<Response<StudentImportCommitResult>>();
        Assert.False(wrongCenterPayload!.Succeeded);

        var wrongUser = SecurityTestSupport.Client(
            _factory, _seed.TeacherA, AppRoles.Teacher, _seed.CenterA);

        var wrongUserResponse = await wrongUser.PostAsJsonAsync(
            Routing.StudentRouting.ImportCommit,
            new CommitStudentImportCommand { SessionId = preview.Data.SessionId });
        var wrongUserPayload =
            await wrongUserResponse.Content.ReadFromJsonAsync<Response<StudentImportCommitResult>>();
        Assert.False(wrongUserPayload!.Succeeded);

        using (var scope = _factory.Services.CreateScope())
        {
            var store = scope.ServiceProvider.GetRequiredService<IImportSessionStore>();
            var session = store.GetSession(
                preview.Data.SessionId,
                _seed.CenterOwnerA.ToString(),
                _seed.CenterA);
            Assert.NotNull(session);
            session!.ExpiresAt = DateTime.UtcNow.AddMinutes(-1);
        }

        var expired = await Owner().PostAsJsonAsync(
            Routing.StudentRouting.ImportCommit,
            new CommitStudentImportCommand { SessionId = preview.Data.SessionId });
        var expiredPayload =
            await expired.Content.ReadFromJsonAsync<Response<StudentImportCommitResult>>();
        Assert.False(expiredPayload!.Succeeded);
    }
}

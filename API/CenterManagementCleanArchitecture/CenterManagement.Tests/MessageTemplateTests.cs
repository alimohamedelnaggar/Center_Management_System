using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using CenterManagement.Data.AppMetaData;
using CenterManagement.Data.Entities.Abstractions;
using CenterManagement.Data.Entities.Subscriptions;
using CenterManagement.Data.Enums;
using CenterManagement.Infrustructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace CenterManagement.Tests;

/// <summary>
/// Proves the WhatsApp message-template feature end-to-end: the three fixed
/// types with defaults, owner-only editing, Arabic validation errors, restore to
/// default, center isolation, module gating and wa.me URL encoding.
/// </summary>
public sealed class MessageTemplateTests : IClassFixture<ScopeApiFactory>
{
    private const string ListRoute = "Api/V1/MessageTemplate/List";

    private readonly ScopeApiFactory _factory;
    private readonly SeedResult _seed;

    public MessageTemplateTests(ScopeApiFactory factory)
    {
        _factory = factory;
        _seed = factory.EnsureSeeded();

        // Every test starts from "no custom templates" on the fixture's shared
        // SQLite database and with the WhatsApp module enabled.
        ClearTemplates(_seed.CenterA);
        ClearTemplates(_seed.CenterB);
        SetModule(_seed.CenterA, ModuleKeys.Whatsapp, true);
    }

    [Fact]
    public async Task List_Returns_Three_Defaults_When_Nothing_Is_Customized()
    {
        var response = await OwnerClient().GetAsync(ListRoute);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var doc = await ReadJson(response);
        var items = doc.RootElement.GetProperty("data").EnumerateArray().ToList();

        Assert.Equal(3, items.Count);
        Assert.Equal(
            new[] { "absence", "examResult", "feesReminder" },
            items.Select(item => item.GetProperty("key").GetString()).ToArray());

        foreach (var item in items)
        {
            Assert.Equal(
                item.GetProperty("defaultBody").GetString(),
                item.GetProperty("body").GetString());
            Assert.False(item.GetProperty("isCustomized").GetBoolean());
            Assert.Equal(500, item.GetProperty("maxLength").GetInt32());

            var placeholders = item.GetProperty("placeholders").EnumerateArray().ToList();
            Assert.NotEmpty(placeholders);
            Assert.All(placeholders, placeholder =>
            {
                Assert.False(string.IsNullOrWhiteSpace(placeholder.GetProperty("key").GetString()));
                Assert.False(string.IsNullOrWhiteSpace(placeholder.GetProperty("label").GetString()));
            });
        }
    }

    [Fact]
    public async Task Update_Trims_And_Persists_A_Custom_Body()
    {
        const string custom = "أهلاً {student} في {group} يوم {date}.\nمع تحيات {center}.";

        var response = await OwnerClient().PutAsJsonAsync(
            "Api/V1/MessageTemplate/Update",
            new { key = "absence", body = $"  {custom}  " });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using (var doc = await ReadJson(response))
        {
            var data = doc.RootElement.GetProperty("data");
            Assert.Equal("absence", data.GetProperty("key").GetString());
            Assert.Equal(custom, data.GetProperty("body").GetString());
            Assert.True(data.GetProperty("isCustomized").GetBoolean());
        }

        using var listDoc = await ReadJson(await OwnerClient().GetAsync(ListRoute));
        var absence = Template(listDoc, "absence");

        Assert.Equal(custom, absence.GetProperty("body").GetString());
        Assert.True(absence.GetProperty("isCustomized").GetBoolean());
    }

    [Fact]
    public async Task Update_Rejects_Unknown_Placeholder_With_Arabic_Message()
    {
        var response = await OwnerClient().PutAsJsonAsync(
            "Api/V1/MessageTemplate/Update",
            new { key = "absence", body = "مرحباً {unknown}" });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        using var doc = await ReadJson(response);
        var message = ReadMessage(doc);

        Assert.Contains("غير معروف", message);
        Assert.Contains("{unknown}", message);
    }

    [Fact]
    public async Task Update_Rejects_Body_Longer_Than_500_Characters()
    {
        var body = new string('ا', 501);

        var response = await OwnerClient().PutAsJsonAsync(
            "Api/V1/MessageTemplate/Update",
            new { key = "absence", body });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        using var doc = await ReadJson(response);
        Assert.Contains("500", ReadMessage(doc));
    }

    [Fact]
    public async Task Update_Rejects_Phone_Numbers()
    {
        var response = await OwnerClient().PutAsJsonAsync(
            "Api/V1/MessageTemplate/Update",
            new { key = "absence", body = "للاستفسار اتصل على 01012345678" });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        using var doc = await ReadJson(response);
        Assert.Contains("هاتف", ReadMessage(doc));
    }

    [Fact]
    public async Task Update_Rejects_External_Links()
    {
        var response = await OwnerClient().PutAsJsonAsync(
            "Api/V1/MessageTemplate/Update",
            new { key = "absence", body = "التفاصيل على https://example.com" });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        using var doc = await ReadJson(response);
        Assert.Contains("رابط", ReadMessage(doc));
    }

    [Fact]
    public async Task Reset_Restores_The_Default_Body()
    {
        const string custom = "نص مخصص للطالب {student} في {group} بتاريخ {date} من {center}.";

        var update = await OwnerClient().PutAsJsonAsync(
            "Api/V1/MessageTemplate/Update",
            new { key = "absence", body = custom });
        Assert.Equal(HttpStatusCode.OK, update.StatusCode);

        var reset = await OwnerClient().PostAsync("Api/V1/MessageTemplate/absence/Reset", null);
        Assert.Equal(HttpStatusCode.OK, reset.StatusCode);

        using (var doc = await ReadJson(reset))
        {
            var data = doc.RootElement.GetProperty("data");
            Assert.Equal(
                data.GetProperty("defaultBody").GetString(),
                data.GetProperty("body").GetString());
            Assert.False(data.GetProperty("isCustomized").GetBoolean());
        }

        using var listDoc = await ReadJson(await OwnerClient().GetAsync(ListRoute));
        var absence = Template(listDoc, "absence");

        Assert.Equal(absence.GetProperty("defaultBody").GetString(), absence.GetProperty("body").GetString());
        Assert.False(absence.GetProperty("isCustomized").GetBoolean());
    }

    [Fact]
    public async Task Assistant_And_Teacher_Can_Read_But_Cannot_Edit()
    {
        var readers = new[]
        {
            (_seed.AssistantA, AppRoles.Assistant),
            (_seed.TeacherA, AppRoles.Teacher)
        };

        foreach (var (userId, role) in readers)
        {
            var client = Client(userId, role, _seed.CenterA);

            var read = await client.GetAsync(ListRoute);
            Assert.Equal(HttpStatusCode.OK, read.StatusCode);

            var write = await client.PutAsJsonAsync(
                "Api/V1/MessageTemplate/Update",
                new { key = "absence", body = "نص من {student} في {group} يوم {date} مع {center}." });

            Assert.Equal(HttpStatusCode.Forbidden, write.StatusCode);
        }
    }

    [Fact]
    public async Task Solo_Teacher_Can_Edit()
    {
        var client = Client(_seed.SoloTeacherA, AppRoles.Teacher, _seed.CenterA, isCenterAdmin: true);

        var response = await client.PutAsJsonAsync(
            "Api/V1/MessageTemplate/Update",
            new { key = "examResult", body = "نتيجة {student}: {score} من {total} في {exam}، {center}." });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task Disabled_WhatsApp_Module_Returns_403_MODULE_DISABLED()
    {
        try
        {
            SetModule(_seed.CenterA, ModuleKeys.Whatsapp, false);

            var disabled = await OwnerClient().GetAsync(ListRoute);

            Assert.Equal(HttpStatusCode.Forbidden, disabled.StatusCode);
            Assert.Contains(
                ModuleAccessCodes.ModuleDisabled,
                await disabled.Content.ReadAsStringAsync());
        }
        finally
        {
            SetModule(_seed.CenterA, ModuleKeys.Whatsapp, true);
        }
    }

    [Fact]
    public async Task Templates_Are_Isolated_Between_Centers()
    {
        const string custom = "نص المركز الأول للطالب {student} في {group} بتاريخ {date} مع {center}.";

        var update = await OwnerClient().PutAsJsonAsync(
            "Api/V1/MessageTemplate/Update",
            new { key = "absence", body = custom });
        Assert.Equal(HttpStatusCode.OK, update.StatusCode);

        // A real owner of Center B: same feature, different tenant.
        var ownerB = await SecurityTestSupport.CreateUserAsync(
            _factory,
            SecurityTestSupport.RandomDigits(11),
            $"owner-b-{Guid.NewGuid():N}@example.com",
            role: AppRoles.CenterOwner,
            centerId: _seed.CenterB);

        using var centerBDoc = await ReadJson(
            await Client(ownerB, AppRoles.CenterOwner, _seed.CenterB).GetAsync(ListRoute));
        var centerBAbsence = Template(centerBDoc, "absence");

        Assert.Equal(
            centerBAbsence.GetProperty("defaultBody").GetString(),
            centerBAbsence.GetProperty("body").GetString());
        Assert.False(centerBAbsence.GetProperty("isCustomized").GetBoolean());

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var centerARow = await db.CenterMessageTemplates
            .IgnoreQueryFilters()
            .SingleAsync(row => row.CenterId == _seed.CenterA && row.Type == MessageTemplateType.Absence);

        Assert.Equal(custom, centerARow.Body);

        Assert.False(await db.CenterMessageTemplates
            .IgnoreQueryFilters()
            .AnyAsync(row =>
                row.CenterId == _seed.CenterB &&
                row.Type == MessageTemplateType.Absence &&
                !row.IsDeleted));
    }

    [Fact]
    public async Task Preview_Renders_Sample_Values_And_Builds_An_Encoded_WaMe_Link()
    {
        const string body = "سطر أول للطالب {student}\nسطر ثانٍ & 100%";
        const string expectedText = "سطر أول للطالب أحمد محمد\nسطر ثانٍ & 100%";

        var response = await OwnerClient().PostAsJsonAsync(
            "Api/V1/MessageTemplate/Preview",
            new { key = "absence", body });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var doc = await ReadJson(response);
        var data = doc.RootElement.GetProperty("data");

        var text = data.GetProperty("text").GetString();
        var encoded = data.GetProperty("encodedText").GetString();
        var url = data.GetProperty("whatsAppUrl").GetString();

        Assert.Equal(expectedText, text);
        Assert.DoesNotContain("{student}", text);

        // Arabic + line break are UTF-8 percent encoded, never left raw.
        Assert.Equal(text, Uri.UnescapeDataString(encoded!));
        Assert.Contains("%0A", encoded);
        Assert.Contains("%D8", encoded);
        Assert.DoesNotContain(" ", encoded);

        Assert.Equal($"https://wa.me/201000000000?text={encoded}", url);
    }

    // ------------------------------------------------------------------
    // helpers
    // ------------------------------------------------------------------

    private HttpClient OwnerClient() =>
        Client(_seed.CenterOwnerA, AppRoles.CenterOwner, _seed.CenterA);

    private HttpClient Client(Guid userId, string role, Guid centerId, bool isCenterAdmin = false)
    {
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(
            "Bearer",
            SecurityTestSupport.CreateToken(userId, role, centerId, isCenterAdmin));

        return client;
    }

    private static JsonElement Template(JsonDocument doc, string key) =>
        doc.RootElement.GetProperty("data")
            .EnumerateArray()
            .First(item => item.GetProperty("key").GetString() == key);

    private static async Task<JsonDocument> ReadJson(HttpResponseMessage response) =>
        JsonDocument.Parse(await response.Content.ReadAsStringAsync());

    private static string? ReadMessage(JsonDocument doc) =>
        doc.RootElement.TryGetProperty("message", out var message)
            ? message.GetString()
            : doc.RootElement.TryGetProperty("Message", out var pascalMessage)
                ? pascalMessage.GetString()
                : null;

    private void ClearTemplates(Guid centerId)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        db.Database.ExecuteSqlRaw(
            "DELETE FROM CenterMessageTemplates WHERE CenterId = {0}",
            centerId);
    }

    private void SetModule(Guid centerId, string moduleKey, bool enabled)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var row = db.CenterModules
            .IgnoreQueryFilters()
            .FirstOrDefault(module => module.CenterId == centerId && module.ModuleKey == moduleKey);

        if (row is null)
        {
            row = new CenterModule
            {
                CenterId = centerId,
                ModuleKey = moduleKey
            };

            db.CenterModules.Add(row);
        }

        row.IsEnabled = enabled;
        row.IsDeleted = false;
        db.SaveChanges();

        scope.ServiceProvider.GetRequiredService<ICenterModuleService>().Invalidate(centerId);
    }
}

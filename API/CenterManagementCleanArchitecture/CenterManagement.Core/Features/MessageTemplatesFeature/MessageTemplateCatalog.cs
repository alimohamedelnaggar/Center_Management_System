using CenterManagement.Core.Features.MessageTemplatesFeature.Dtos;

namespace CenterManagement.Core.Features.MessageTemplatesFeature;

/// <summary>
/// The single source of truth for the WhatsApp quick-message templates.
///
/// These are *manual* <c>wa.me</c> link templates: the operator clicks a button
/// and the message is prefilled in WhatsApp. Nothing here sends messages
/// automatically and these are not Meta message templates.
///
/// A template type is fixed (it can never be deleted) and every type has a
/// default body that the owner can restore with one click.
/// </summary>
public static class MessageTemplateCatalog
{
    public const int MaxBodyLength = 500;

    public sealed record PlaceholderDefinition(string Key, string Label);

    public sealed record TemplateDefinition(
        MessageTemplateType Type,
        string Key,
        string DefaultBody,
        IReadOnlyList<PlaceholderDefinition> Placeholders);

    private static readonly IReadOnlyDictionary<string, PlaceholderDefinition> KnownPlaceholders =
        new Dictionary<string, PlaceholderDefinition>(StringComparer.Ordinal)
        {
            ["student"] = new("student", "اسم الطالب"),
            ["group"] = new("group", "اسم المجموعة"),
            ["center"] = new("center", "اسم المركز"),
            ["date"] = new("date", "التاريخ"),
            ["exam"] = new("exam", "اسم الامتحان"),
            ["score"] = new("score", "الدرجة"),
            ["total"] = new("total", "الدرجة النهائية"),
            ["amount"] = new("amount", "المبلغ المتبقي"),
            ["month"] = new("month", "الشهر")
        };

    public static IReadOnlyList<TemplateDefinition> All { get; } =
    [
        new TemplateDefinition(
            MessageTemplateType.Absence,
            "absence",
            "السلام عليكم، نحيطكم علماً بأن الطالب {student} تغيّب عن حصة {group} بتاريخ {date}.\nمع تحيات {center}.",
            BuildPlaceholders("student", "group", "center", "date")),

        new TemplateDefinition(
            MessageTemplateType.ExamResult,
            "examResult",
            "السلام عليكم، حصل الطالب {student} على {score} من {total} في {exam}.\nمع تحيات {center}.",
            BuildPlaceholders("student", "center", "exam", "score", "total")),

        new TemplateDefinition(
            MessageTemplateType.FeesReminder,
            "feesReminder",
            "مرحباً، نود تذكيركم بسداد اشتراك شهر {month} للطالب {student}. المتبقي: {amount}.\nمع تحيات {center}.",
            BuildPlaceholders("student", "center", "amount", "month"))
    ];

    public static TemplateDefinition? FindByKey(string? key)
    {
        if (string.IsNullOrWhiteSpace(key))
            return null;

        var normalized = key.Trim();

        return All.FirstOrDefault(definition =>
            string.Equals(definition.Key, normalized, StringComparison.OrdinalIgnoreCase));
    }

    public static TemplateDefinition? FindByType(MessageTemplateType type) =>
        All.FirstOrDefault(definition => definition.Type == type);

    public static IReadOnlyDictionary<string, string> SampleValues(TemplateDefinition definition)
    {
        var samples = new Dictionary<string, string>(StringComparer.Ordinal)
        {
            ["student"] = "أحمد محمد",
            ["group"] = "مجموعة الرياضيات",
            ["center"] = "مركز النجاح",
            ["date"] = "07/11/2026",
            ["exam"] = "امتحان الوحدة الأولى",
            ["score"] = "18",
            ["total"] = "20",
            ["amount"] = "250.00 جنيه",
            ["month"] = "نوفمبر"
        };

        return definition.Placeholders.ToDictionary(
            placeholder => placeholder.Key,
            placeholder => samples[placeholder.Key],
            StringComparer.Ordinal);
    }

    public static MessageTemplateDto BuildDto(TemplateDefinition definition, string? storedBody)
    {
        var hasStoredBody = !string.IsNullOrWhiteSpace(storedBody);
        var effectiveBody = hasStoredBody ? storedBody! : definition.DefaultBody;

        return new MessageTemplateDto
        {
            Key = definition.Key,
            Body = effectiveBody,
            DefaultBody = definition.DefaultBody,
            IsCustomized = hasStoredBody &&
                           !string.Equals(effectiveBody, definition.DefaultBody, StringComparison.Ordinal),
            MaxLength = MaxBodyLength,
            Placeholders = definition.Placeholders
                .Select(placeholder => new MessageTemplatePlaceholderDto
                {
                    Key = placeholder.Key,
                    Label = placeholder.Label
                })
                .ToList()
        };
    }

    private static IReadOnlyList<PlaceholderDefinition> BuildPlaceholders(params string[] keys) =>
        keys.Select(key => KnownPlaceholders[key]).ToList();
}

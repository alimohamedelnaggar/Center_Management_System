using System.Text.Json;

namespace CenterManagement.Core.Common;

// Anti-cheat: known violation types, their Arabic labels, and helpers to
// (de)serialize the per-attempt violation log stored as a JSON dictionary.
public static class ExamViolationCatalog
{
    private static readonly Dictionary<string, string> _labels =
        new(StringComparer.OrdinalIgnoreCase)
        {
            ["tab-switch"] = "مغادرة نافذة الامتحان",
            ["window-blur"] = "فقدان التركيز على الامتحان",
            ["fullscreen-exit"] = "الخروج من ملء الشاشة",
            ["copy"] = "محاولة نسخ",
            ["cut"] = "محاولة قص",
            ["paste"] = "محاولة لصق",
            ["right-click"] = "النقر بزر الفأرة الأيمن",
            ["screenshot"] = "محاولة التقاط صورة للشاشة",
            ["print"] = "محاولة طباعة",
            ["devtools"] = "محاولة فتح أدوات المطور"
        };

    public static IReadOnlyDictionary<string, string> Labels => _labels;

    public static bool IsKnown(string? type)
        => !string.IsNullOrWhiteSpace(type) && _labels.ContainsKey(type);

    public static string Normalize(string? type)
        => type != null && _labels.ContainsKey(type)
            ? type.ToLowerInvariant()
            : "unknown";

    public static string GetLabel(string type)
        => _labels.TryGetValue(type, out var label) ? label : "مخالفة غير معروفة";

    public static Dictionary<string, int> ParseLog(string? json)
    {
        if (string.IsNullOrWhiteSpace(json))
            return new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);

        try
        {
            var parsed = JsonSerializer.Deserialize<Dictionary<string, int>>(json);
            return parsed != null
                ? new Dictionary<string, int>(parsed, StringComparer.OrdinalIgnoreCase)
                : new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
        }
        catch
        {
            return new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
        }
    }

    public static string SerializeLog(IDictionary<string, int> log)
        => JsonSerializer.Serialize(log);

    private const int MaxTimelineEvents = 200;

    public static List<ViolationEvent> ParseTimeline(string? json)
    {
        if (string.IsNullOrWhiteSpace(json))
            return new List<ViolationEvent>();

        try
        {
            var parsed = JsonSerializer.Deserialize<List<ViolationEvent>>(json);
            return parsed ?? new List<ViolationEvent>();
        }
        catch
        {
            return new List<ViolationEvent>();
        }
    }

    public static string AppendTimeline(string? json, string type, DateTime at)
    {
        var events = ParseTimeline(json);
        events.Add(new ViolationEvent { Type = type, At = at });

        if (events.Count > MaxTimelineEvents)
            events = events.Skip(events.Count - MaxTimelineEvents).ToList();

        return JsonSerializer.Serialize(events);
    }
}

public sealed class ViolationEvent
{
    public string Type { get; set; } = default!;
    public DateTime At { get; set; }
}

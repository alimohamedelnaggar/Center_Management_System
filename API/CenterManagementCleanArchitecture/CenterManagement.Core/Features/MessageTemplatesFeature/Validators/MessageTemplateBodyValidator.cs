using System.Text.RegularExpressions;

namespace CenterManagement.Core.Features.MessageTemplatesFeature.Validators;

/// <summary>
/// Validates a template body before it is stored:
/// non-empty, at most 500 characters, no phone numbers, no external links and
/// only whitelisted placeholders for that template type.
/// </summary>
public static class MessageTemplateBodyValidator
{
    public const int MaxLength = MessageTemplateCatalog.MaxBodyLength;

    private static readonly Regex PlaceholderPattern = new(
        @"\{([^{}]*)\}",
        RegexOptions.Compiled | RegexOptions.CultureInvariant);

    // A run of digits (optionally with common phone separators) long enough to
    // be a phone number. Ordinary short numbers inside text are not rejected.
    private static readonly Regex PhonePattern = new(
        @"(?<!\d)(?:\+?\d[\d\s\-()]{6,}\d)(?!\d)",
        RegexOptions.Compiled | RegexOptions.CultureInvariant);

    private static readonly Regex ExternalLinkPattern = new(
        @"(https?:\/\/|www\.|wa\.me|t\.me|telegram\.me|bit\.ly|\b[\w-]+\.(?:com|net|org|io|me|ly|co|eg|info|edu|gov)\b)",
        RegexOptions.Compiled | RegexOptions.CultureInvariant | RegexOptions.IgnoreCase);

    /// <summary>
    /// Returns the first Arabic validation error, or <c>null</c> when the body
    /// is valid. The caller trims and stores the body.
    /// </summary>
    public static string? Validate(
        MessageTemplateCatalog.TemplateDefinition definition,
        string? body)
    {
        var text = body?.Trim() ?? string.Empty;

        if (text.Length == 0)
            return "نص الرسالة مطلوب";

        if (text.Length > MaxLength)
            return $"نص الرسالة يجب ألا يزيد عن {MaxLength} حرف";

        if (PhonePattern.IsMatch(text))
            return "لا يمكن أن يحتوي نص الرسالة على رقم هاتف";

        if (ExternalLinkPattern.IsMatch(text))
            return "لا يمكن أن يحتوي نص الرسالة على رابط خارجي";

        var allowedKeys = definition.Placeholders
            .Select(placeholder => placeholder.Key)
            .ToHashSet(StringComparer.Ordinal);

        foreach (Match match in PlaceholderPattern.Matches(text))
        {
            var key = match.Groups[1].Value;

            if (!allowedKeys.Contains(key))
            {
                var allowed = string.Join("، ", definition.Placeholders.Select(p => "{" + p.Key + "}"));
                return $"المتغير {match.Value} غير معروف. المتغيرات المسموحة: {allowed}";
            }
        }

        // Detect a dangling "{" or "}" that the placeholder pattern could not parse.
        var withoutPlaceholders = PlaceholderPattern.Replace(text, string.Empty);

        if (withoutPlaceholders.Contains('{') || withoutPlaceholders.Contains('}'))
            return "صيغة المتغيرات غير صحيحة، استخدم الأقواس بهذا الشكل: {student}";

        return null;
    }
}

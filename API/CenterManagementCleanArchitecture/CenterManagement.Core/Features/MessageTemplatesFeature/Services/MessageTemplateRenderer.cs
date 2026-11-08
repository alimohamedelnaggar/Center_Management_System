using System.Text.RegularExpressions;

namespace CenterManagement.Core.Features.MessageTemplatesFeature.Services;

/// <summary>
/// Renders templates and builds manual <c>wa.me</c> links. The link only
/// prefills WhatsApp; the operator still has to press send.
/// </summary>
public static class MessageTemplateRenderer
{
    /// <summary>A demo number used by the preview endpoint (no real recipient).</summary>
    public const string PreviewPhoneNumber = "201000000000";

    private static readonly Regex PlaceholderPattern = new(
        @"\{([A-Za-z0-9_]+)\}",
        RegexOptions.Compiled | RegexOptions.CultureInvariant);

    public static string Render(string body, IReadOnlyDictionary<string, string> values)
    {
        if (string.IsNullOrEmpty(body))
            return string.Empty;

        return PlaceholderPattern.Replace(body, match =>
        {
            var key = match.Groups[1].Value;

            return values.TryGetValue(key, out var value) && !string.IsNullOrWhiteSpace(value)
                ? value
                : match.Value;
        });
    }

    /// <summary>
    /// URL-encodes the text with UTF-8 (Arabic letters, line breaks and symbols)
    /// and appends it to a wa.me link. Uses <see cref="Uri.EscapeDataString"/>
    /// so spaces become %20 (wa.me accepts that) rather than '+'.
    /// </summary>
    public static string BuildWhatsAppUrl(string phoneNumber, string message)
    {
        var encoded = Uri.EscapeDataString(message ?? string.Empty);

        return $"https://wa.me/{phoneNumber}?text={encoded}";
    }
}

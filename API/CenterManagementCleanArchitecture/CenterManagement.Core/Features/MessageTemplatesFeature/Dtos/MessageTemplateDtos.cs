namespace CenterManagement.Core.Features.MessageTemplatesFeature.Dtos;

public sealed class MessageTemplatePlaceholderDto
{
    public string Key { get; set; } = default!;
    public string Label { get; set; } = default!;
}

public sealed class MessageTemplateDto
{
    public string Key { get; set; } = default!;

    /// <summary>The body currently in effect (stored body or the default).</summary>
    public string Body { get; set; } = default!;

    /// <summary>The built-in default, used by the "restore" action.</summary>
    public string DefaultBody { get; set; } = default!;

    /// <summary>True only when the stored body differs from the default.</summary>
    public bool IsCustomized { get; set; }

    public int MaxLength { get; set; }

    public List<MessageTemplatePlaceholderDto> Placeholders { get; set; } = new();
}

public sealed class MessageTemplatePreviewDto
{
    public string Key { get; set; } = default!;

    /// <summary>The body rendered with the built-in sample values.</summary>
    public string Text { get; set; } = default!;

    /// <summary>The rendered text, URL-encoded (UTF-8) for a wa.me link.</summary>
    public string EncodedText { get; set; } = default!;

    /// <summary>A wa.me link using a demo phone number, for a live preview.</summary>
    public string WhatsAppUrl { get; set; } = default!;

    public Dictionary<string, string> SampleValues { get; set; } = new();
}

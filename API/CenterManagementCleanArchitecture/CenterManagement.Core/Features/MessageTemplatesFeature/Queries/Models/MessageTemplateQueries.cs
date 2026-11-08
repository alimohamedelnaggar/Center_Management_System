using CenterManagement.Core.Features.MessageTemplatesFeature.Dtos;

namespace CenterManagement.Core.Features.MessageTemplatesFeature.Queries.Models;

/// <summary>Returns the three fixed templates with their effective bodies.</summary>
public class GetMessageTemplatesQuery : IRequest<Response<List<MessageTemplateDto>>>
{
}

/// <summary>
/// Renders a template with sample values. <see cref="Body"/> is optional: when
/// omitted the stored (or default) body is used, so the editor can preview an
/// unsaved draft by sending it explicitly.
/// </summary>
public class PreviewMessageTemplateQuery : IRequest<Response<MessageTemplatePreviewDto>>
{
    public string Key { get; set; } = default!;
    public string? Body { get; set; }
}

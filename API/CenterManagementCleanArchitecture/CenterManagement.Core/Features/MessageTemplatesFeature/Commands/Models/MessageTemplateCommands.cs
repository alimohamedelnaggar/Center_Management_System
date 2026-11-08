using CenterManagement.Core.Features.MessageTemplatesFeature.Dtos;

namespace CenterManagement.Core.Features.MessageTemplatesFeature.Commands.Models;

/// <summary>Stores a custom body for one fixed template type.</summary>
public class UpdateMessageTemplateCommand : IRequest<Response<MessageTemplateDto>>
{
    public string Key { get; set; } = default!;
    public string Body { get; set; } = default!;
}

/// <summary>Restores the built-in default body of one fixed template type.</summary>
public class ResetMessageTemplateCommand : IRequest<Response<MessageTemplateDto>>
{
    public string Key { get; set; } = default!;

    public ResetMessageTemplateCommand(string key)
    {
        Key = key;
    }
}

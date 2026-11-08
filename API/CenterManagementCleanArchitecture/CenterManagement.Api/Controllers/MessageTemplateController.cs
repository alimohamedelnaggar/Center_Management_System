using CenterManagement.Core.Features.MessageTemplatesFeature.Commands.Models;
using CenterManagement.Core.Features.MessageTemplatesFeature.Queries.Models;

namespace CenterManagement.Api.Controllers;

/// <summary>
/// Owner-editable WhatsApp quick-message templates (manual wa.me links only;
/// nothing is sent automatically). Reading is open to everyone who uses
/// WhatsApp (owner, solo teacher, assistant, teacher); editing and restoring
/// are restricted to center admins (owner / solo teacher).
/// </summary>
[RequireModule(ModuleKeys.Whatsapp)]
public class MessageTemplateController : AppControllerBase
{
    #region Read
    [HttpGet(Routing.MessageTemplateRouting.List)]
    [Authorize(Policy = AppPolicies.CenterAdminAcademic)]
    public async Task<IActionResult> List()
    {
        var result = await _mediator.Send(new GetMessageTemplatesQuery());

        return NewResult(result);
    }
    #endregion

    #region Update
    [HttpPut(Routing.MessageTemplateRouting.Update)]
    [Authorize(Policy = AppPolicies.CenterAdmin)]
    public async Task<IActionResult> Update([FromBody] UpdateMessageTemplateCommand command)
    {
        var result = await _mediator.Send(command);

        return NewResult(result);
    }
    #endregion

    #region Reset to default
    [HttpPost(Routing.MessageTemplateRouting.Reset)]
    [Authorize(Policy = AppPolicies.CenterAdmin)]
    public async Task<IActionResult> Reset([FromRoute] string key)
    {
        var result = await _mediator.Send(new ResetMessageTemplateCommand(key));

        return NewResult(result);
    }
    #endregion

    #region Preview
    [HttpPost(Routing.MessageTemplateRouting.Preview)]
    [Authorize(Policy = AppPolicies.CenterAdminAcademic)]
    public async Task<IActionResult> Preview([FromBody] PreviewMessageTemplateQuery query)
    {
        var result = await _mediator.Send(query);

        return NewResult(result);
    }
    #endregion
}

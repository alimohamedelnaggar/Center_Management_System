using CenterManagement.Core.Features.UsersFeature.Assistant.Commands.Models;
using CenterManagement.Core.Features.UsersFeature.Assistant.Queries;
using CenterManagement.Core.Features.UsersFeature.Assistant.Queries.Models;
using MediatR;

namespace CenterManagement.Api.Controllers.Users;

[Authorize(Policy = AppPolicies.CenterAdmin)]
[CoreEndpoint]
public class AssistantController : AppControllerBase
{
    [HttpPost(Routing.AssistantRouting.Create)]
    public async Task<IActionResult> AddAssistant(AddAssistantCommand command)
    {
        var response = await _mediator.Send(command);
        return NewResult(response);
    }
    [HttpPut(Routing.AssistantRouting.Edit)]
    public async Task<IActionResult> Edit(
    [FromBody] EditAssistantCommand command)
    {
        var result = await _mediator.Send(command);

        return NewResult(result);
    }
    [HttpDelete(Routing.AssistantRouting.Delete)]
    public async Task<IActionResult> DeleteAssistant(Guid id)
    {
        var result = await _mediator.Send(new DeleteAssistantCommand
        {
            Id = id
        });

        return NewResult(result);
    }
    [HttpGet(Routing.AssistantRouting.GetByID)]
    public async Task<IActionResult> GetById(Guid id)
    {
        var result = await _mediator.Send(new GetAssistantByIdQuery
        {
            Id = id
        });

        return NewResult(result);
    }
    [HttpGet(Routing.AssistantRouting.Paginated)]
    public async Task<IActionResult> GetAll([FromQuery] GetAssistantsPaginatedQuery query)
    {
        var result = await _mediator.Send(query);

        return NewResult(result);
    }
    [HttpPost(Routing.AssistantRouting.Pay)]
    public async Task<IActionResult> PaySalary(
    [FromBody] PayAssistantSalaryCommand command)
    {
        var result = await _mediator.Send(command);

        return NewResult(result);
    }
    [HttpPut(Routing.AssistantRouting.EditPay)]
    public async Task<IActionResult> EditSalaryPayment(
    [FromBody] UpdateAssistantSalaryPaymentCommand command)
    {
        var result = await _mediator.Send(command);

        return NewResult(result);
    }
    [HttpDelete(Routing.AssistantRouting.DeletePay)]
    public async Task<IActionResult> DeleteSalaryPayment(Guid paymentId)
    {
        var result = await _mediator.Send(
            new DeleteAssistantSalaryPaymentCommand
            {
                PaymentId = paymentId
            });

        return NewResult(result);
    }
    [HttpGet(Routing.AssistantRouting.SalaryInfo)]
    public async Task<IActionResult> GetSalaryInfo(Guid assistantId)
    {
        var result = await _mediator.Send(
            new GetAssistantSalaryInfoQuery
            {
                AssistantId = assistantId
            });

        return NewResult(result);
    }
    [HttpGet(Routing.AssistantRouting.SalaryStatus)]
    public async Task<IActionResult> GetSalaryStatus(
    [FromQuery] GetAssistantsSalaryStatusQuery query)
    {
        var result = await _mediator.Send(query);

        return NewResult(result);
    }

    /// <summary>
    /// Generates a one-time temporary password for an assistant in the caller's
    /// center and revokes the assistant's active sessions.
    /// </summary>
    [HttpPost(Routing.AssistantRouting.ResetPassword)]
    public async Task<IActionResult> ResetPassword(Guid id)
    {
        var result = await _mediator.Send(new ResetAssistantPasswordCommand
        {
            AssistantId = id
        });

        return NewResult(result);
    }

}
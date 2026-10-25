using CenterManagement.Core.Features.Payments.Commands.DeletePayment;
using CenterManagement.Core.Features.Payments.Commands.Models;
using CenterManagement.Core.Features.Payments.Queries.Models;

//
namespace CenterManagement.Api.Controllers;

[Authorize(Policy = AppPolicies.CenterAdminAcademic)]
[RequireModule(ModuleKeys.Payments)]
public class PaymentController : AppControllerBase
{
    [HttpPost(Routing.PaymentsRoute.Create)]
    public async Task<IActionResult> Add([FromBody] AddPaymentCommand command, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(command, cancellationToken);

        if (!result.Succeeded) return BadRequest(result);

        return Ok(result);
    }
    [HttpPut(Routing.PaymentsRoute.Edit)]
    [Authorize(Policy = AppPolicies.CenterAdmin)]
    public async Task<IActionResult> Edit([FromBody] UpdatePaymentCommand command, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(command, cancellationToken);

        if (!result.Succeeded) return BadRequest(result);

        return Ok(result);
    }
    [HttpGet(Routing.PaymentsRoute.GetStudentPaymentInfo)]
    public async Task<IActionResult> GetStudentPaymentInfo(
     Guid studentId,
     [FromQuery] DateOnly? billingPeriod,
     [FromQuery] int? sessionsCount,
     CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(
            new GetStudentPaymentInfoQuery(studentId, billingPeriod, sessionsCount),
            cancellationToken);

        return NewResult(result);
    }
    [HttpGet(Routing.PaymentsRoute.Paginated)]
    public async Task<IActionResult> GetPaginatedList([FromQuery] GetPaymentsPaginatedQuery query, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(query, cancellationToken);
        return Ok(result);
    }
    [HttpGet(Routing.PaymentsRoute.StudentsFinance)]
    [Authorize(Policy = AppPolicies.CenterAdmin)]
    public async Task<IActionResult> GetStudentsFinance(
    [FromQuery] GetStudentsFinanceQuery query,
    CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(query, cancellationToken);
        return Ok(result);
    }

    [HttpGet(Routing.PaymentsRoute.OverdueStudents)]
    public async Task<IActionResult> GetOverdueStudents(
        [FromQuery] GetOverdueStudentsQuery query,
        CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(query, cancellationToken);

        return Ok(result);
    }

    [HttpGet(Routing.PaymentsRoute.GetAll)]
    public async Task<IActionResult> GetAll()
    {
        var result = await _mediator.Send(new GetPaymentsQuery());

        return NewResult(result);
    }
    [HttpGet(Routing.PaymentsRoute.Receipt)]
    public async Task<IActionResult> GetReceipt(
        [FromRoute] Guid paymentId,
        CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(
            new GetPaymentReceiptQuery(paymentId),
            cancellationToken);

        return NewResult(result);
    }

    [HttpDelete(Routing.PaymentsRoute.Delete)]
    [Authorize(Policy = AppPolicies.CenterAdmin)]
    public async Task<IActionResult> Delete(
    [FromRoute] Guid paymentId)
    {
        var response = await _mediator.Send(
            new DeletePaymentCommand(paymentId));

        return NewResult(response);
    }
}

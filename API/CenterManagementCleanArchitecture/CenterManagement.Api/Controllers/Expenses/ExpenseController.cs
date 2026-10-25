using CenterManagement.Core.Features.ExpenseFeature.Students.Commands.Models;
using CenterManagement.Core.Features.ExpenseFeature.Students.Queries.Models;

namespace CenterManagement.Api.Controllers.Expenses;

[Authorize(Policy = AppPolicies.CenterAdmin)]
[RequireModule(ModuleKeys.Accounting)]
public class ExpenseController : AppControllerBase
{
    [HttpPost(Routing.ExpenseRouting.Create)]
    public async Task<IActionResult> Add(AddExpenseCommand command)
    {
        var response = await _mediator.Send(command);

        return NewResult(response);
    }
    [HttpPut(Routing.ExpenseRouting.Edit)]
    public async Task<IActionResult> Edit(EditExpenseCommand command)
    {
        var response = await _mediator.Send(command);

        return NewResult(response);
    }
    [HttpDelete(Routing.ExpenseRouting.Delete)]
    public async Task<IActionResult> Delete(Guid id)
    {
        var response = await _mediator.Send(new DeleteExpenseCommand(id));

        return NewResult(response);
    }
    [HttpGet(Routing.ExpenseRouting.Paginated)]
    public async Task<IActionResult> GetPaginated([FromQuery] GetExpensePaginatedListQuery query)
    {
        var result = await _mediator.Send(query);

        return NewResult(result);
    }
    [HttpGet(Routing.ExpenseRouting.GetByID)]
    public async Task<IActionResult> GetById(Guid id)
    {
        var result = await _mediator.Send(new GetExpenseByIdQuery(id));

        return NewResult(result);
    }
}
using CenterManagement.Core.Features.ExpenseCategoryFeature.Queries.Models;
using CenterManagement.Core.Features.ExpenseCategoryFeature.Students.Commands.Models;
using Routing = CenterManagement.Data.AppMetaData.Routing;

namespace CenterManagement.Api.Controllers.Expenses;

[Authorize(Policy = AppPolicies.CenterAdmin)]
[RequireModule(ModuleKeys.Accounting)]
public class ExpenseCategoryController : AppControllerBase
{
    [HttpPost(Routing.ExpenseCategoryRouting.Create)]
    public async Task<IActionResult> Add(AddExpenseCategoryCommand command)
    {
        var response = await _mediator.Send(command);

        return NewResult(response);
    }
    [HttpPut(Routing.ExpenseCategoryRouting.Edit)]
    public async Task<IActionResult> Edit(EditExpenseCategoryCommand command)
    {
        var response = await _mediator.Send(command);

        return NewResult(response);
    }
    [HttpDelete(Routing.ExpenseCategoryRouting.Delete)]
    public async Task<IActionResult> Delete(Guid Id)
    {
        var response = await _mediator.Send(new DeleteExpenseCategoryCommand(Id));

        return NewResult(response);
    }
    [HttpGet(Routing.ExpenseCategoryRouting.Paginated)]
    public async Task<IActionResult> Paginated([FromQuery] GetExpenseCategoryPaginatedListQuery query)
    {
        var result = await _mediator.Send(query);

        return NewResult(result);
    }
    [HttpGet(Routing.ExpenseCategoryRouting.GetAll)]
    public async Task<IActionResult> GetAll()
    {
        var result = await _mediator.Send(new GetExpenseCategoryistQuery());

        return NewResult(result);
    }
}
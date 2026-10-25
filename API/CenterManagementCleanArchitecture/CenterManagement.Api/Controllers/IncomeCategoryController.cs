using CenterManagement.Core.Features.IncomeCategoryFeature.Queries.Models;
using CenterManagement.Core.Features.Incomes.IncomeCategoryFeature.Commands;
using Microsoft.AspNetCore.Mvc;

namespace CenterManagement.Api.Controllers.Incomes;

[Authorize(Policy = AppPolicies.CenterAdminTeacher)]
[RequireModule(ModuleKeys.Accounting)]
public class IncomeCategoryController : AppControllerBase
{
    [HttpPost(Routing.IncomeCategoryRouting.Create)]
    public async Task<IActionResult> Add(AddIncomeCategoryCommand command)
    {
        var response = await _mediator.Send(command);

        return NewResult(response);
    }

    [HttpPut(Routing.IncomeCategoryRouting.Edit)]
    public async Task<IActionResult> Edit(EditIncomeCategoryCommand command)
    {
        var response = await _mediator.Send(command);

        return NewResult(response);
    }

    [HttpDelete(Routing.IncomeCategoryRouting.Delete)]
    public async Task<IActionResult> Delete(Guid Id)
    {
        var response = await _mediator.Send(new DeleteIncomeCategoryCommand(Id));

        return NewResult(response);
    }

    [HttpGet(Routing.IncomeCategoryRouting.Paginated)]
    public async Task<IActionResult> Paginated([FromQuery] GetIncomeCategoryPaginatedListQuery query)
    {
        var result = await _mediator.Send(query);

        return NewResult(result);
    }

    [HttpGet(Routing.IncomeCategoryRouting.GetAll)]
    public async Task<IActionResult> GetAll()
    {
        var result = await _mediator.Send(new GetIncomeCategoryListQuery());

        return NewResult(result);
    }
}
using CenterManagement.Core.Features.IncomeFeature.Commands.Models;
using CenterManagement.Core.Features.IncomeFeature.Queries.Models;
using Microsoft.AspNetCore.Mvc;
using Routing = CenterManagement.Data.AppMetaData.Routing;

namespace CenterManagement.Api.Controllers.Incomes;

[Authorize(Policy = AppPolicies.CenterAdminTeacher)]
[RequireModule(ModuleKeys.Accounting)]
public class IncomeController : AppControllerBase
{
    [HttpPost(Routing.IncomeRouting.Create)]
    public async Task<IActionResult> Add(AddIncomeCommand command)
    {
        var response = await _mediator.Send(command);

        return NewResult(response);
    }

    [HttpPut(Routing.IncomeRouting.Edit)]
    public async Task<IActionResult> Edit(EditIncomeCommand command)
    {
        var response = await _mediator.Send(command);

        return NewResult(response);
    }

    [HttpDelete(Routing.IncomeRouting.Delete)]
    public async Task<IActionResult> Delete(Guid id)
    {
        var response = await _mediator.Send(new DeleteIncomeCommand(id));

        return NewResult(response);
    }

    [HttpGet(Routing.IncomeRouting.Paginated)]
    public async Task<IActionResult> GetPaginated([FromQuery] GetIncomePaginatedListQuery query)
    {
        var result = await _mediator.Send(query);

        return NewResult(result);
    }

    [HttpGet(Routing.IncomeRouting.GetByID)]
    public async Task<IActionResult> GetById(Guid id)
    {
        var result = await _mediator.Send(new GetIncomeByIdQuery(id));

        return NewResult(result);
    }
}


namespace CenterManagement.API.Controllers;

[Authorize(Policy = AppPolicies.CenterAdminAcademic)]
[CoreEndpoint]
public class GroupController : AppControllerBase
{

    [HttpPost(Routing.GroupRouting.Create)]
    [Authorize(Policy = AppPolicies.CenterAdmin)]
    public async Task<IActionResult> Create([FromBody] CreateGroupCommand command)
    {
        var response = await _mediator.Send(command);
        return NewResult(response);
    }

    [HttpPut(Routing.GroupRouting.Edit)]
    [Authorize(Policy = AppPolicies.CenterAdmin)]
    public async Task<IActionResult> Edit([FromBody] UpdateGroupCommand command)
    {
        var response = await _mediator.Send(command);
        return NewResult(response);
    }

    [HttpDelete(Routing.GroupRouting.Delete)]
    [Authorize(Policy = AppPolicies.CenterAdmin)]
    public async Task<IActionResult> Delete([FromRoute] Guid id)
    {
        var response = await _mediator.Send(new DeleteGroupCommand(id));
        return NewResult(response);
    }

    [HttpGet(Routing.GroupRouting.GetByID)]
    public async Task<IActionResult> GetById([FromRoute] Guid id)
    {
        var response = await _mediator.Send(new GetGroupByIdQuery(id));
        return NewResult(response);
    }

    [HttpGet(Routing.GroupRouting.Paginated)]
    public async Task<IActionResult> GetPaginated([FromQuery] GetGroupsPaginationQuery query)
    {
        var response = await _mediator.Send(query);
        return Ok(response);
    }
    [HttpGet(Routing.GroupRouting.GetAll)]
    public async Task<IActionResult> GetAll()
    {
        var response = await _mediator.Send(new GetGroupListQuery());
        return Ok(response);
    }


}
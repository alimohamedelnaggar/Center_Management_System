using CenterManagement.Api.Base;
using CenterManagement.Core.Features.UsersFeature.Teacher.Commands.Models;
using CenterManagement.Core.Features.UsersFeature.Teacher.Queries.Models;
using CenterManagement.Data.AppMetaData;
using Microsoft.AspNetCore.Authorization;

namespace CenterManagement.Api.Controllers.Users;

[Authorize(Policy = AppPolicies.CenterAdmin)]
[CoreEndpoint]
public class TeacherController : AppControllerBase
{
    [HttpPost(Routing.TeacherRouting.Create)]
    public async Task<IActionResult> AddTeacher(AddTeacherCommand command)
    {
        var response = await _mediator.Send(command);
        return NewResult(response);
    }

    [HttpPut(Routing.TeacherRouting.Edit)]
    public async Task<IActionResult> Edit(EditTeacherCommand command)
    {
        var response = await _mediator.Send(command);
        return NewResult(response);
    }

    [HttpDelete(Routing.TeacherRouting.Delete)]
    public async Task<IActionResult> Delete(Guid id)
    {
        var response = await _mediator.Send(new DeleteTeacherCommand { Id = id });
        return NewResult(response);
    }

    [HttpGet(Routing.TeacherRouting.Paginated)]
    public async Task<IActionResult> GetPaginated([FromQuery] GetTeachersPaginatedQuery query)
    {
        var response = await _mediator.Send(query);
        return NewResult(response);
    }
}

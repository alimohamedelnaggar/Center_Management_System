//namespace CenterManagement.API.Controllers.Auth;

//[AllowAnonymous]
//public class ApplicationUserController : AppControllerBase
//{

//    [HttpGet(Routing.ApplicationUserRouting.Paginated)]
//    public async Task<IActionResult> Paginated([FromQuery] GetUserPaginationQuery query)
//    {
//        var response = await _mediator.Send(query);
//        return Ok(response);
//    }
//    [HttpGet(Routing.ApplicationUserRouting.GetByID)]
//    public async Task<IActionResult> GetStudentByID([FromRoute] int id)
//    {
//        return NewResult(await _mediator.Send(new GetUserByIdQuery(id)));
//    }
//    [HttpPut(Routing.ApplicationUserRouting.Edit)]
//    public async Task<IActionResult> Edit([FromBody] EditUserCommand command)
//    {
//        var response = await _mediator.Send(command);
//        return NewResult(response);
//    }
//    [HttpDelete(Routing.ApplicationUserRouting.Delete)]
//    public async Task<IActionResult> Delete([FromRoute] Guid id)
//    {
//        return NewResult(await _mediator.Send(new DeleteUserCommand(id)));
//    }
//    [HttpPut(Routing.ApplicationUserRouting.ChangePassword)]
//    public async Task<IActionResult> ChangePassword([FromBody] ChangeUserPasswordCommand command)
//    {
//        var response = await _mediator.Send(command);
//        return NewResult(response);
//    }
//}

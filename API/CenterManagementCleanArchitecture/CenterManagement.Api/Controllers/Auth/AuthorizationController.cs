//using CenterManagement.Core.Features.Auth.Authorization.Commands.Models;
//using CenterManagement.Core.Features.Auth.Authorization.Quaries.Models;
//using Swashbuckle.AspNetCore.Annotations;

//namespace CenterManagement.API.Controllers.Auth;

//public class AuthorizationController : AppControllerBase
//{
//    [HttpPost(Routing.AuthorizationRouting.Create)]
//    public async Task<IActionResult> Create([FromForm] AddRoleCommand command)
//    {
//        var response = await _mediator.Send(command);
//        return NewResult(response);
//    }

//    [HttpPost(Routing.AuthorizationRouting.Edit)]
//    public async Task<IActionResult> Edit([FromForm] EditRoleCommand command)
//    {
//        var response = await _mediator.Send(command);
//        return NewResult(response);
//    }


//    [HttpDelete(Routing.AuthorizationRouting.Delete)]
//    public async Task<IActionResult> Delete([FromRoute] string id)
//    {
//        var response = await _mediator.Send(new DeleteRoleCommand() { Id = id });
//        return NewResult(response);
//    }


//    [HttpGet(Routing.AuthorizationRouting.RoleList)]
//    public async Task<IActionResult> GetRoleList()
//    {
//        var response = await _mediator.Send(new GetRolesListQuery());
//        return NewResult(response);
//    }
//    [SwaggerOperation(Summary = "idالصلاحية عن طريق ال", OperationId = "RoleById")]
//    [HttpGet(Routing.AuthorizationRouting.GetRoleById)]
//    public async Task<IActionResult> GetRoleById([FromRoute] int id)
//    {
//        var response = await _mediator.Send(new GetRoleByIdQuery() { Id = id });
//        return NewResult(response);
//    }
//    [SwaggerOperation(Summary = " ادارة صلاحيات المستخدمين", OperationId = "ManageUserRoles")]
//    [HttpGet(Routing.AuthorizationRouting.ManageUserRoles)]
//    public async Task<IActionResult> ManageUserRoles([FromRoute] int userId)
//    {
//        var response = await _mediator.Send(new ManageUserRolesQuery() { UserId = userId });
//        return NewResult(response);
//    }
//    [SwaggerOperation(Summary = " تعديل صلاحيات المستخدمين", OperationId = "UpdateUserRoles")]
//    [HttpPut(Routing.AuthorizationRouting.UpdateUserRoles)]
//    public async Task<IActionResult> UpdateUserRoles([FromBody] UpdateUserRolesCommand command)
//    {
//        var response = await _mediator.Send(command);
//        return NewResult(response);
//    }
//    [SwaggerOperation(Summary = " ادارة صلاحيات الاستخدام المستخدمين", OperationId = "ManageUserClaims")]
//    [HttpGet(Routing.AuthorizationRouting.ManageUserClaims)]
//    public async Task<IActionResult> ManageUserClaims([FromRoute] int userId)
//    {
//        var response = await _mediator.Send(new ManageUserClaimsQuery() { UserId = userId });
//        return NewResult(response);
//    }
//    [SwaggerOperation(Summary = " تعديل صلاحيات  الاستخدام المستخدمين", OperationId = "UpdateUserClaims")]
//    [HttpPut(Routing.AuthorizationRouting.UpdateUserClaims)]
//    public async Task<IActionResult> UpdateUserClaims([FromBody] UpdateUserClaimsCommand command)
//    {
//        var response = await _mediator.Send(command);
//        return NewResult(response);
//    }
//}
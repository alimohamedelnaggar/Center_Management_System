//using CenterManagement.Core.Features.Auth.Authentication.Query.Models;

//namespace CenterManagement.API.Controllers.Auth;

//[AllowAnonymous]
//public class ConfirmEmailController : AppControllerBase
//{

//    [HttpGet(Routing.Authentication.ConfirmEmail)]
//    public async Task<IActionResult> ConfirmEmail([FromQuery] ConfirmEmailQuery query)
//    {
//        var response = await _mediator.Send(query);

//        if (response.Succeeded)
//        {
//            return Redirect("http://localhost:4200/auth/email-confirmed");
//        }

//        return BadRequest(response);
//    }
//}
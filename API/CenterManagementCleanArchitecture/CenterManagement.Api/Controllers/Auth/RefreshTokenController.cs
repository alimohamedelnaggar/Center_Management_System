//using CenterManagement.Core.Features.Auth.RefreshTokenFeature.Command.Models;
//using CenterManagement.Core.Features.Auth.RefreshTokenFeature.Query.Models;

//namespace CenterManagement.API.Controllers.Auth;

//public class RefreshTokenController : AppControllerBase
//{

//    [HttpPost(Routing.Authentication.RefreshToken)]
//    public async Task<IActionResult> RefreshToken([FromForm] RefreshTokenCommand command)
//    {
//        var response = await _mediator.Send(command);
//        return NewResult(response);
//    }


//    [HttpGet(Routing.Authentication.ValidateToken)]
//    public async Task<IActionResult> ValidateToken([FromQuery] ValidateAccessTokenQuery query)
//    {
//        var response = await _mediator.Send(query);
//        return NewResult(response);
//    }
//}
using CenterManagement.Core.Features.UsersFeature.Students.Queries.Models;

namespace CenterManagement.Api.Controllers;

// Public endpoint used by the student card QR: a parent scans the card with a
// normal phone camera and sees attendance + exam grades without an account.
// Modules are enforced inside the handler (center resolved from the QR code).
[SelfModuleChecked]
public class StudentCardController : AppControllerBase
{
    [HttpGet(Routing.StudentCardRouting.ByCode)]
    [AllowAnonymous]
    public async Task<IActionResult> GetCard([FromRoute] string code)
    {
        var response = await _mediator.Send(new GetStudentCardQuery { Code = code });

        return NewResult(response);
    }
}

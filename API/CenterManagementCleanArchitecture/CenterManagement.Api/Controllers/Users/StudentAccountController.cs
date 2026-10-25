using CenterManagement.Core.Features.UsersFeature.Students.Commands.Models;

namespace CenterManagement.Api.Controllers.Users;

/// <summary>
/// Student login-account operations that are allowed for center admins and,
/// within their scope, for teachers/assistants. Kept separate from
/// <see cref="StudentController"/> (which is restricted to the Operational
/// policy) so the effective policy is not the intersection of the two.
/// </summary>
[Authorize(Policy = AppPolicies.CenterAdminAcademic)]
[CoreEndpoint]
public class StudentAccountController : AppControllerBase
{
    [HttpPut(Routing.StudentRouting.ResetPassword)]
    public async Task<IActionResult> ResetPassword(Guid id)
    {
        var result = await _mediator.Send(
            new ResetStudentPasswordCommand { StudentId = id });

        return NewResult(result);
    }
}

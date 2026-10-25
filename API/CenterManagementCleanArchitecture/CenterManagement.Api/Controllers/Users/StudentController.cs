using CenterManagement.Core.Features.ParentPortalFeature.Commands.Models;
using CenterManagement.Core.Features.UsersFeature.Students.Commands.Models;
using CenterManagement.Core.Features.UsersFeature.Students.Queries.Models;

namespace CenterManagement.Api.Controllers.Users;


[Authorize(Policy = AppPolicies.CenterAdminAcademic)]
[CoreEndpoint]
public partial class StudentController : AppControllerBase
{
    [HttpPost(Routing.StudentRouting.Create)]
    public async Task<IActionResult> AddStudent(AddStudentCommand command)
    {
        var response = await _mediator.Send(command);
        return NewResult(response);
    }

    [HttpGet(Routing.StudentRouting.Paginated)]
    public async Task<IActionResult> Paginated([FromQuery] GetStudentsPaginatedQuery query)
    {
        var result = await _mediator.Send(query);

        return NewResult(result);
    }
    [HttpGet(Routing.StudentRouting.Stats)]
    public async Task<IActionResult> GetStudentStats()
    {
        var result = await _mediator.Send(new GetStudentStatsQuery());

        return NewResult(result);
    }


    [HttpPut(Routing.StudentRouting.ChangeStatus)]
    public async Task<IActionResult> ChangeStatus(Guid id)
    {
        var result = await _mediator.Send(new ChangeStatusStudentCommand(id));
        return NewResult(result);
    }
    [HttpPut(Routing.StudentRouting.ChangePaymentStatus)]
    [RequireModule(ModuleKeys.Payments)]
    public async Task<IActionResult> ChangePaymentStatus(Guid id)
    {
        var result = await _mediator.Send(new ChangePaymentStatusStudentCommand(id));

        return NewResult(result);
    }
    [HttpDelete(Routing.StudentRouting.Delete)]
    public async Task<IActionResult> Delete(Guid id)
    {
        var result = await _mediator.Send(new DeleteStudentCommand(id));

        return NewResult(result);
    }
    [HttpPut(Routing.StudentRouting.Edit)]
    public async Task<IActionResult> Edit([FromBody] EditStudentCommand command)
    {
        var result = await _mediator.Send(command);

        return NewResult(result);
    }

    // Backstop for students created before QR codes existed.
    [HttpPost(Routing.StudentRouting.GenerateQrCodes)]
    [Authorize(Policy = AppPolicies.CenterAdmin)]
    [RequireModule(ModuleKeys.Attendance)]
    public async Task<IActionResult> GenerateQrCodes()
    {
        var result = await _mediator.Send(new GenerateMissingQrCodesCommand());

        return NewResult(result);
    }

    // Backstop: create login accounts for students created before accounts existed.
    [HttpPost(Routing.StudentRouting.GenerateAccounts)]
    [Authorize(Policy = AppPolicies.CenterAdmin)]
    public async Task<IActionResult> GenerateAccounts()
    {
        var result = await _mediator.Send(new GenerateStudentAccountsCommand());
        return NewResult(result);
    }

    // Creates (or reuses) the parent login account for the student's parent phone.
    [HttpPost(Routing.StudentRouting.CreateParentAccount)]
    [Authorize(Policy = AppPolicies.CenterAdmin)]
    [RequireModule(ModuleKeys.ParentPortal)]
    public async Task<IActionResult> CreateParentAccount(Guid id)
    {
        var result = await _mediator.Send(new CreateParentAccountCommand { StudentId = id });
        return NewResult(result);
    }

    // Creates (or reuses) the parent login accounts of many students in one go.
    [HttpPost(Routing.StudentRouting.BulkCreateParentAccounts)]
    [Authorize(Policy = AppPolicies.CenterAdmin)]
    [RequireModule(ModuleKeys.ParentPortal)]
    public async Task<IActionResult> BulkCreateParentAccounts([FromBody] BulkCreateParentAccountsCommand command)
    {
        var result = await _mediator.Send(command);
        return NewResult(result);
    }
}

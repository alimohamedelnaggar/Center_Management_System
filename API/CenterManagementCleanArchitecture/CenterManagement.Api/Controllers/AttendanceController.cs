using CenterManagement.Core.Features.AttendenceFeature.Commands.Models;
using CenterManagement.Core.Features.AttendenceFeature.Queries.Models;

namespace CenterManagement.Api.Controllers;


[Authorize(Policy = AppPolicies.Operational)]
[RequireModule(ModuleKeys.Attendance)]
public class AttendanceController : AppControllerBase
{
    [HttpPost(Routing.AttendanceRouting.Create)]
    public async Task<IActionResult> SaveAttendence(SaveStudentAttendanceCommand command)
    {
        var response = await _mediator.Send(command);
        return NewResult(response);
    }
    [HttpGet(Routing.AttendanceRouting.GetByGroupIdSessionId)]
    public async Task<IActionResult> GetAttendence(GetStudentsAttendanceQuery command)
    {
        var response = await _mediator.Send(command);
        return NewResult(response);
    }
    [HttpGet(Routing.AttendanceRouting.Stats)]
    public async Task<IActionResult> GetStats()
    {
        var result = await _mediator.Send(new GetAttendanceStatsQuery());

        return NewResult(result);
    }
    [HttpGet(Routing.AttendanceRouting.GetForAttendence)]
    public async Task<IActionResult> GettAllForAttendence([FromQuery] GetStudentsForTakeAttendenceQuery query)
    {
        var result = await _mediator.Send(query);

        return NewResult(result);
    }

    // Attendance by scanning the student card QR. Center manager, Teacher or Assistant.
    [HttpPost(Routing.AttendanceRouting.Scan)]
    [Authorize(Policy = AppPolicies.Operational)]
    public async Task<IActionResult> ScanAttendence(ScanStudentAttendanceCommand command)
    {
        var result = await _mediator.Send(command);

        return NewResult(result);
    }

    // Sessions that are running right now, used to pick the session automatically.
    [HttpGet(Routing.AttendanceRouting.RunningSessions)]
    [Authorize(Policy = AppPolicies.Operational)]
    public async Task<IActionResult> GetRunningSessions([FromQuery] GetRunningSessionsQuery query)
    {
        var result = await _mediator.Send(query);

        return NewResult(result);
    }
}
using CenterManagement.Core.Features.ParentPortalFeature.Commands.Models;
using CenterManagement.Core.Features.ParentPortalFeature.Queries.Models;

namespace CenterManagement.Api.Controllers;

// The parent portal itself is a module. The endpoint scopes every query to the
// parent resolved from the JWT, so a parent can only ever see his own children.
[Authorize(Roles = AppRoles.Parent)]
[RequireModule(ModuleKeys.ParentPortal)]
public class ParentPortalController : AppControllerBase
{
    [HttpGet(Routing.ParentPortalRouting.Children)]
    public async Task<IActionResult> Children()
    {
        var result = await _mediator.Send(new GetMyChildrenQuery());

        return NewResult(result);
    }

    // NOTE: the per-child sections below are intentionally NOT decorated with
    // [RequireModule(<section>)]: that filter runs before the handler, which
    // would answer 403 for a locked section even when the student is not linked
    // to the caller (leaking the student's existence). The handler instead
    // proves the parent/child link first (404) and only then enforces the
    // section module (403 MODULE_DISABLED).

    [HttpGet(Routing.ParentPortalRouting.ChildSummary)]
    public async Task<IActionResult> ChildSummary(Guid studentId)
    {
        var result = await _mediator.Send(new GetChildSummaryQuery(studentId));

        return NewResult(result);
    }

    [HttpGet(Routing.ParentPortalRouting.ChildAttendance)]
    public async Task<IActionResult> ChildAttendance(Guid studentId)
    {
        var result = await _mediator.Send(new GetChildAttendanceQuery(studentId));

        return NewResult(result);
    }

    [HttpGet(Routing.ParentPortalRouting.ChildGrades)]
    public async Task<IActionResult> ChildGrades(Guid studentId)
    {
        var result = await _mediator.Send(new GetChildGradesQuery(studentId));

        return NewResult(result);
    }

    [HttpGet(Routing.ParentPortalRouting.ChildExams)]
    public async Task<IActionResult> ChildExams(Guid studentId)
    {
        var result = await _mediator.Send(new GetChildExamResultsQuery(studentId));

        return NewResult(result);
    }

    [HttpGet(Routing.ParentPortalRouting.ChildPayments)]
    public async Task<IActionResult> ChildPayments(Guid studentId)
    {
        var result = await _mediator.Send(new GetChildPaymentsQuery(studentId));

        return NewResult(result);
    }

    // ---- in-app notifications (reuse the shared notifications table) ----
    // The class-level [RequireModule(parent_portal)] already gates these; every
    // query/command additionally scopes to the signed-in parent's own children.

    [HttpGet(Routing.ParentPortalRouting.Notifications)]
    public async Task<IActionResult> Notifications([FromQuery] GetParentNotificationsQuery query)
    {
        var result = await _mediator.Send(query);

        return NewResult(result);
    }

    [HttpGet(Routing.ParentPortalRouting.UnreadCount)]
    public async Task<IActionResult> UnreadCount()
    {
        var result = await _mediator.Send(new GetParentUnreadNotificationsCountQuery());

        return NewResult(result);
    }

    [HttpPut(Routing.ParentPortalRouting.MarkRead)]
    public async Task<IActionResult> MarkRead(Guid id)
    {
        var result = await _mediator.Send(new MarkParentNotificationReadCommand(id));

        return NewResult(result);
    }

    [HttpPost(Routing.ParentPortalRouting.MarkAllRead)]
    public async Task<IActionResult> MarkAllRead()
    {
        var result = await _mediator.Send(new MarkParentNotificationsReadAllCommand());

        return NewResult(result);
    }
}

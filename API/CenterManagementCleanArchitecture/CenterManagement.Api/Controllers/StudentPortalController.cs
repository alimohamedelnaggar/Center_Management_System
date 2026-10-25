using CenterManagement.Core.Features.StudentPortalFeature.Commands.Models;
using CenterManagement.Core.Features.StudentPortalFeature.Dtos;
using CenterManagement.Core.Features.StudentPortalFeature.Queries.Models;

namespace CenterManagement.Api.Controllers;

// The student portal itself is a module; each section additionally requires the
// underlying module (attendance, payments, study notes, online exams).
[Authorize(Roles = AppRoles.Student)]
[RequireModule(ModuleKeys.StudentPortal)]
public class StudentPortalController : AppControllerBase
{
    #region Profile
    [HttpGet(Routing.StudentPortalRouting.Profile)]
    public async Task<IActionResult> Profile()
    {
        var result = await _mediator.Send(new GetStudentProfileQuery());

        return NewResult(result);
    }
    #endregion

    #region Exams
    [HttpGet(Routing.StudentPortalRouting.AvailableExams)]
    [RequireModule(ModuleKeys.OnlineExams)]
    public async Task<IActionResult> AvailableExams()
    {
        var result = await _mediator.Send(new GetAvailableStudentExamsQuery());

        return NewResult(result);
    }

    [HttpPost(Routing.StudentPortalRouting.StartExam)]
    [RequireModule(ModuleKeys.OnlineExams)]
    public async Task<IActionResult> StartExam(Guid examId)
    {
        var result = await _mediator.Send(new StartStudentExamCommand(examId));

        return NewResult(result);
    }

    [HttpGet(Routing.StudentPortalRouting.GetAttempt)]
    [RequireModule(ModuleKeys.OnlineExams)]
    public async Task<IActionResult> GetAttempt(Guid attemptId)
    {
        var result = await _mediator.Send(new GetStudentAttemptQuery(attemptId));

        return NewResult(result);
    }

    [HttpPost(Routing.StudentPortalRouting.SubmitAttempt)]
    [RequireModule(ModuleKeys.OnlineExams)]
    public async Task<IActionResult> Submit(
        Guid attemptId,
        [FromBody] List<StudentSubmitAnswerDTO> answers)
    {
        var result = await _mediator.Send(
            new SubmitStudentExamCommand(attemptId, answers ?? new List<StudentSubmitAnswerDTO>()));

        return NewResult(result);
    }

    [HttpPost(Routing.StudentPortalRouting.ReportViolation)]
    [RequireModule(ModuleKeys.OnlineExams)]
    public async Task<IActionResult> ReportViolation(
        Guid attemptId,
        [FromBody] StudentViolationDTO violation)
    {
        var result = await _mediator.Send(
            new ReportExamViolationCommand(attemptId, violation?.Type ?? string.Empty));

        return NewResult(result);
    }
    #endregion

    #region Results
    [HttpGet(Routing.StudentPortalRouting.Results)]
    [RequireModule(ModuleKeys.Grades)]
    public async Task<IActionResult> Results()
    {
        var result = await _mediator.Send(new GetStudentResultsQuery());

        return NewResult(result);
    }

    [HttpGet(Routing.StudentPortalRouting.ExamPreview)]
    [RequireModule(ModuleKeys.OnlineExams)]
    public async Task<IActionResult> ExamPreview(Guid examId)
    {
        var result = await _mediator.Send(new GetStudentExamPreviewQuery(examId));

        return NewResult(result);
    }
    #endregion

    #region Subscriptions
    [HttpGet(Routing.StudentPortalRouting.Subscriptions)]
    [RequireModule(ModuleKeys.Payments)]
    public async Task<IActionResult> Subscriptions()
    {
        var result = await _mediator.Send(new GetStudentSubscriptionsQuery());

        return NewResult(result);
    }
    #endregion

    #region Attendance
    [HttpGet(Routing.StudentPortalRouting.Attendance)]
    [RequireModule(ModuleKeys.Attendance)]
    public async Task<IActionResult> Attendance()
    {
        var result = await _mediator.Send(new GetStudentAttendanceQuery());

        return NewResult(result);
    }
    #endregion

    #region Payments
    [HttpGet(Routing.StudentPortalRouting.Payments)]
    [RequireModule(ModuleKeys.Payments)]
    public async Task<IActionResult> Payments()
    {
        var result = await _mediator.Send(new GetStudentPaymentsQuery());

        return NewResult(result);
    }
    #endregion

    #region Notes
    [HttpGet(Routing.StudentPortalRouting.Notes)]
    [RequireModule(ModuleKeys.StudyNotes)]
    public async Task<IActionResult> Notes()
    {
        var result = await _mediator.Send(new GetStudentNotesQuery());

        return NewResult(result);
    }
    #endregion

    #region Notifications
    [HttpGet(Routing.StudentPortalRouting.Notifications)]
    public async Task<IActionResult> Notifications([FromQuery] GetStudentNotificationsQuery query)
    {
        var result = await _mediator.Send(query);

        return NewResult(result);
    }

    [HttpGet(Routing.StudentPortalRouting.UnreadCount)]
    public async Task<IActionResult> UnreadCount()
    {
        var result = await _mediator.Send(new GetStudentUnreadNotificationsCountQuery());

        return NewResult(result);
    }

    [HttpPut(Routing.StudentPortalRouting.MarkRead)]
    public async Task<IActionResult> MarkRead(Guid id)
    {
        var result = await _mediator.Send(new MarkNotificationReadCommand(id));

        return NewResult(result);
    }

    [HttpPost(Routing.StudentPortalRouting.MarkAllRead)]
    public async Task<IActionResult> MarkAllRead()
    {
        var result = await _mediator.Send(new MarkAllNotificationsReadCommand());

        return NewResult(result);
    }
    #endregion
}

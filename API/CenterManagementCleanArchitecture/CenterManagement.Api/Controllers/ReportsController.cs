using CenterManagement.Core.Features.Payments.Queries.Handlers;
using CenterManagement.Core.Features.Reports.Queries.GetStudentAttendanceReports;
using CenterManagement.Core.Features.Reports.Queries.GetStudentGroupsHistory;

namespace CenterManagement.Api.Controllers
{

    [Authorize(Policy = AppPolicies.CenterAdminTeacher)]
    public class ReportsController : AppControllerBase
    {
        [HttpGet(Routing.ReportsRoute.GetAttendanceReport)]
        [RequireModule(ModuleKeys.Attendance)]
        public async Task<IActionResult> GetAttendanceReport(
 Guid studentId,
 Guid? groupId,
 CancellationToken cancellationToken)
        {
            var result = await _mediator.Send(
                new GetStudentAttendanceReportQuery(studentId, groupId),
                cancellationToken);

            return NewResult(result);
        }
        [HttpGet(Routing.ReportsRoute.GetFinancialReport)]
        [RequireModule(ModuleKeys.Payments)]
        public async Task<IActionResult> GetFinancialReport(
    Guid studentId,
    CancellationToken cancellationToken)
        {
            var result = await _mediator.Send(
                new GetStudentFinancialReportQuery(studentId),
                cancellationToken);

            return NewResult(result);
        }
        [HttpGet(Routing.ReportsRoute.GetGradesReport)]
        [RequireModule(ModuleKeys.Grades)]
        public async Task<IActionResult> GetGradesReport(
   Guid studentId,
   Guid? groupId,
   CancellationToken cancellationToken)
        {
            var result = await _mediator.Send(
                new GetStudentGradesReportQuery(studentId, groupId),
                cancellationToken);

            return NewResult(result);
        }
        [HttpGet("student-financial-report")]
        [RequireModule(ModuleKeys.Payments)]
        public async Task<IActionResult> GetStudentFinancialReport([FromQuery] GetFinancialReportQuery query)
        {
            var result = await _mediator.Send(query);

            return NewResult(result);
        }
        [HttpGet(Routing.ReportsRoute.GetStudentGroupsHistory)]
        [CoreEndpoint]
        public async Task<IActionResult> GetStudentGroupsHistory(
Guid studentId,
CancellationToken cancellationToken)
        {
            var result = await _mediator.Send(
                new GetStudentGroupsHistoryQuery(studentId),
                cancellationToken);

            return NewResult(result);
        }
    }
}

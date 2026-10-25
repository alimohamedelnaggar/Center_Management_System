using CenterManagement.Core.Features.DashboardReports.Queries.GetAssistantStatistics;
using CenterManagement.Core.Features.DashboardReports.Queries.GetAttendanceCharts;

using CenterManagement.Core.Features.DashboardReports.Queries.GetRecentActivity;
using CenterManagement.Core.Features.DashboardReports.Queries.GetRevenueCharts;
using CenterManagement.Core.Features.DashboardReports.Queries.GetStudentDistributions;
using CenterManagement.Core.Features.DashboardReports.Queries.GetStudentMovement;
using CenterManagement.Core.Features.DashboardReports.Queries.GetTopGroups;

namespace CenterManagement.Api.Controllers;

// The dashboard shell is core (students/groups summaries). Sections that belong
// to a paid module are gated here, and the mixed summary/activity endpoints
// degrade their sections server-side in the handlers.
[Authorize(Policy = AppPolicies.CenterAdmin)]
[CoreEndpoint]
public class DashboardController : AppControllerBase
{

    [HttpGet("dashboard-summary")]
    public async Task<IActionResult> GetDashboardSummary(
     [FromQuery] int year,
     [FromQuery] int month)
    {
        var result = await _mediator.Send(
            new GetDashboardSummaryQuery(year, month));

        return NewResult(result);
    }
    [HttpGet("student-distribution")]
    public async Task<IActionResult> GetStudentDistribution()
    {
        var result = await _mediator.Send(new GetStudentDistributionQuery());

        return NewResult(result);
    }
    [HttpGet("revenue-chart")]
    [RequireModule(ModuleKeys.Payments)]
    public async Task<IActionResult> GetRevenueChart([FromQuery] GetRevenueChartQuery query)
    {
        var result = await _mediator.Send(query);

        return NewResult(result);
    }

    [HttpGet("student-movement")]
    public async Task<IActionResult> GetStudentMovement([FromQuery] int year)
    {
        var result = await _mediator.Send(new GetStudentMovementQuery(year));

        return NewResult(result);
    }

    [HttpGet("attendance-chart")]
    [RequireModule(ModuleKeys.Attendance)]
    public async Task<IActionResult> GetAttendanceChart()
    {
        var result = await _mediator.Send(new GetAttendanceChartQuery());

        return NewResult(result);
    }
    [HttpGet("recent-activity")]
    public async Task<IActionResult> GetRecentActivity()
    {
        var result = await _mediator.Send(
            new GetRecentActivityQuery());

        return NewResult(result);
    }
    [HttpGet("top-groups")]
    [RequireModule(ModuleKeys.Attendance)]
    public async Task<IActionResult> GetTopGroups()
    {
        var result = await _mediator.Send(new GetTopGroupsQuery());

        return NewResult(result);
    }
    [HttpGet("statistics")]
    [RequireModule(ModuleKeys.Accounting)]
    public async Task<IActionResult> GetStatistics()
    {
        var result = await _mediator.Send(new GetAssistantStatisticsQuery());
        return NewResult(result);
    }
}

using CenterManagement.Core.Features.Reports.Queries.GetReportsOverview;

namespace CenterManagement.Api.Controllers.Reports
{
    [Authorize(Policy = AppPolicies.CenterAdminTeacher)]
    [RequireModule(ModuleKeys.CenterReports)]
    public class ReportsOverviewController : AppControllerBase
    {
        [HttpGet(Routing.ReportsOverviewRoute.Overview)]
        public async Task<IActionResult> Overview(
            [FromQuery] int? year,
            [FromQuery] int? month,
            CancellationToken cancellationToken)
        {
            var result = await _mediator.Send(
                new GetReportsOverviewQuery(year, month),
                cancellationToken);

            return NewResult(result);
        }
    }
}

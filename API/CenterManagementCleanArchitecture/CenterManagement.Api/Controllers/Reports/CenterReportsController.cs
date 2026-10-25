using CenterManagement.Core.Features.Reports.Queries.GetCenterReports;

namespace CenterManagement.Api.Controllers.Reports
{
    /// <summary>
    /// Center-wide reports for the center owner / solo teacher. Assistants and
    /// regular teachers are rejected by the CenterAdmin policy (they keep the
    /// scoped <c>ReportsOverviewController</c>).
    /// </summary>
    /// <remarks>
    /// <c>from</c> is inclusive and <c>to</c> is EXCLUSIVE: a record counts when
    /// <c>from &lt;= date &lt; to</c>. To report a whole month pass the first day
    /// of the month as <c>from</c> and the first day of the NEXT month as
    /// <c>to</c> (e.g. <c>from=2026-08-01&amp;to=2026-09-01</c> is August).
    /// </remarks>
    [Authorize(Policy = AppPolicies.CenterAdmin)]
    [RequireModule(ModuleKeys.CenterReports)]
    public class CenterReportsController : AppControllerBase
    {
        [HttpGet(Routing.CenterReportsRoute.Overview)]
        public async Task<IActionResult> Overview(
            [FromQuery] DateOnly? from,
            [FromQuery] DateOnly? to,
            [FromQuery] DateOnly? billingPeriod,
            CancellationToken cancellationToken)
        {
            var result = await _mediator.Send(
                new GetCenterReportsQuery(from, to, billingPeriod),
                cancellationToken);

            return NewResult(result);
        }
    }
}

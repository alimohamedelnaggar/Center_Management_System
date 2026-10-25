namespace CenterManagement.Core.Features.Reports.Queries.GetCenterReports
{
    /// <summary>
    /// Center-wide reports for the center owner / solo teacher.
    /// <list type="bullet">
    /// <item><see cref="From"/>/<see cref="To"/> (inclusive From, exclusive To)
    /// drive the finance lines, the attendance rates, the collected-per-teacher
    /// column and the trend. Default: the current month.</item>
    /// <item><see cref="BillingPeriod"/> drives the per-group expected /
    /// collected / outstanding figures. Default: the current month.</item>
    /// </list>
    /// </summary>
    public sealed record GetCenterReportsQuery(
        DateOnly? From = null,
        DateOnly? To = null,
        DateOnly? BillingPeriod = null)
     : IRequest<Response<CenterReportsDto>>;
}

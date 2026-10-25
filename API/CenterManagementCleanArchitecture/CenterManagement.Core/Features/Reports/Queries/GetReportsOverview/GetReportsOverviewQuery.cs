namespace CenterManagement.Core.Features.Reports.Queries.GetReportsOverview
{
    public sealed record GetReportsOverviewQuery(int? Year = null, int? Month = null)
     : IRequest<Response<ReportsOverviewDto>>;
}

using CenterManagement.Core.Features.DashboardReports.Responses;

namespace CenterManagement.Core.Features.DashboardReports.Queries.GetRevenueCharts;

public sealed record GetRevenueChartQuery(int? Year = null)
    : IRequest<Response<List<RevenueChartDto>>>;
using CenterManagement.Core.Features.DashboardReports.Responses;

namespace CenterManagement.Core.Features.DashboardReports.Queries.GetRecentActivity;

public sealed record GetRecentActivityQuery(int Take = 10)
    : IRequest<Response<List<RecentActivityDto>>>;
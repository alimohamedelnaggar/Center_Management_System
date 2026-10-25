public sealed record GetDashboardSummaryQuery(
    int Year,
    int Month
) : IRequest<Response<DashboardSummaryDto>>;
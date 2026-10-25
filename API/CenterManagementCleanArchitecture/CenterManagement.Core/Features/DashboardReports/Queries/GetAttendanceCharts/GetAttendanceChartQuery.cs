using CenterManagement.Core.Features.DashboardReports.Responses;
using System;
using System.Collections.Generic;
using System.Text;

namespace CenterManagement.Core.Features.DashboardReports.Queries.GetAttendanceCharts
{
    public sealed record GetAttendanceChartQuery
    : IRequest<Response<List<AttendanceChartDto>>>;
}

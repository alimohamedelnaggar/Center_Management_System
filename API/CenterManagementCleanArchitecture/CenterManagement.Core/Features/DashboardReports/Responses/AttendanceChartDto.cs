using System;
using System.Collections.Generic;
using System.Text;

namespace CenterManagement.Core.Features.DashboardReports.Responses
{
    public class AttendanceChartDto
    {
        public string DayName { get; set; } = default!;

        public double AttendanceRate { get; set; }
    }
}

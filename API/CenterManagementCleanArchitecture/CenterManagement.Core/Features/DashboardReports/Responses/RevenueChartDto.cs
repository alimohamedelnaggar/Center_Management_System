using System;
using System.Collections.Generic;
using System.Text;

namespace CenterManagement.Core.Features.DashboardReports.Responses
{
    public class RevenueChartDto
    {
        public int Month { get; set; }

        public string MonthName { get; set; } = default!;

        public decimal Revenue { get; set; }

        public decimal Expenses { get; set; }
    }
}

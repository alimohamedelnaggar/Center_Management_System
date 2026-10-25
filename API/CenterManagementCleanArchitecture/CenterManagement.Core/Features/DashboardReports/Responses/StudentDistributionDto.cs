using System;
using System.Collections.Generic;
using System.Text;

namespace CenterManagement.Core.Features.DashboardReports.Responses
{
    public class StudentDistributionDto
    {
        public string GroupName { get; set; } = default!;

        public int StudentsCount { get; set; }
    }
}

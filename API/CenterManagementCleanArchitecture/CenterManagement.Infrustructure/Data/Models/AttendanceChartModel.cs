using System;
using System.Collections.Generic;
using System.Text;

namespace CenterManagement.Infrustructure.Data.Models
{
    public class AttendanceChartModel
    {
        public DayOfWeek DayOfWeek { get; set; } = default!;

        public double AttendanceRate { get; set; }
    }
}

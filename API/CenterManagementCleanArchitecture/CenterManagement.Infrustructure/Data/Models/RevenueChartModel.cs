using System;
using System.Collections.Generic;
using System.Text;

namespace CenterManagement.Infrustructure.Data.Models
{
    public class RevenueChartModel
    {
        public int Month { get; set; }

        public decimal Revenue { get; set; }

        public decimal Expenses { get; set; }
    }
}

using System;
using System.Collections.Generic;
using System.Text;

namespace CenterManagement.Infrustructure.Data.Models
{
    public class AssistantStatisticsModel
    {
        public int TotalAssistants { get; set; }

        public decimal TotalBasicSalaries { get; set; }

        public decimal TotalBonuses { get; set; }

        public decimal TotalDeductions { get; set; }

        public decimal TotalNetSalaries { get; set; }
    }
}

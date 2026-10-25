using System;
using System.Collections.Generic;
using System.Text;

namespace CenterManagement.Infrustructure.Data.Models
{
    public class RecentActivityModel
    {
        public string ActivityType { get; set; } = default!;

        public string? RelatedName { get; set; }

        public decimal? Amount { get; set; }

        public DateTime Date { get; set; }
    }
}
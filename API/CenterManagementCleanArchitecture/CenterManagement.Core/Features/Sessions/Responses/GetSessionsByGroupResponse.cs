using System;
using System.Collections.Generic;
using System.Text;

namespace CenterManagement.Core.Features.Sessions.Responses
{
    public sealed class GetSessionsByGroupResponse
    {
        public Guid Id { get; set; }

        public DayOfWeek DayOfWeek { get; set; }

        public TimeOnly StartTime { get; set; }

        public TimeOnly EndTime { get; set; }

        public decimal SessionPrice { get; set; }
    }
}

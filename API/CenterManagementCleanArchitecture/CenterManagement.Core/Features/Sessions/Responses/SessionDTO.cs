using System;
using System.Collections.Generic;
using System.Text;

namespace CenterManagement.Core.Features.Sessions.Responses
{
    public sealed class SessionDTO
    {
        public Guid Id { get; set; }

        public Guid GroupId { get; set; }

        public DayOfWeek DayOfWeek { get; set; }

        public TimeOnly StartTime { get; set; }

        public TimeOnly EndTime { get; set; }

        public decimal SessionPrice { get; set; }
    }
}

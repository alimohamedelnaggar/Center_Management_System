using System;
using System.Collections.Generic;
using System.Text;

namespace CenterManagement.Core.Features.Sessions.Commands.AddSessions
{
    public class AddSessionCommand:IRequest<Response<Guid>>
    {
        public Guid GroupId { get; init; }

        public DayOfWeek DayOfWeek { get; init; }

        public TimeOnly StartTime { get; init; }

        public TimeOnly EndTime { get; init; }

        public decimal SessionPrice { get; init; }
    }
}

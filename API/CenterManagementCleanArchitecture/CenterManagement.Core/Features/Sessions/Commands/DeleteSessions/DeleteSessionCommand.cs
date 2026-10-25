using System;
using System.Collections.Generic;
using System.Text;

namespace CenterManagement.Core.Features.Sessions.Commands.DeleteSessions
{
    public sealed record DeleteSessionCommand(Guid Id)
    : IRequest<Response<Guid>>;
}

using CenterManagement.Core.Features.Sessions.Responses;
using System;
using System.Collections.Generic;
using System.Text;

namespace CenterManagement.Core.Features.Sessions.Queries.GetSessionById
{
    public sealed record GetSessionByIdQuery(Guid Id)
    : IRequest<Response<GetSessionByIdResponse>>;
}

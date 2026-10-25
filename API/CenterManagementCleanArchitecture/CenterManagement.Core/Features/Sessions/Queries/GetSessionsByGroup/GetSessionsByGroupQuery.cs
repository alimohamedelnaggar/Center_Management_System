using CenterManagement.Core.Features.Sessions.Responses;
using System;
using System.Collections.Generic;
using System.Text;

namespace CenterManagement.Core.Features.Sessions.Queries.GetSessionsByGroup
{
    public sealed record GetSessionsByGroupQuery(Guid GroupId)
    : IRequest<Response<List<GetSessionsByGroupResponse>>>;
}

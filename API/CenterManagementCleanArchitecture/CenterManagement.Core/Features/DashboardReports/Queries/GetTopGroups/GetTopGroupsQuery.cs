using System;
using System.Collections.Generic;
using System.Text;

namespace CenterManagement.Core.Features.DashboardReports.Queries.GetTopGroups
{
    public sealed record GetTopGroupsQuery()
     : IRequest<Response<List<TopGroupDto>>>;
}

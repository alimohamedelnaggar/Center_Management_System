using CenterManagement.Core.Features.DashboardReports.Responses;
using System;
using System.Collections.Generic;
using System.Text;

namespace CenterManagement.Core.Features.DashboardReports.Queries.GetStudentDistributions
{
    public sealed record GetStudentDistributionQuery
      : IRequest<Response<List<StudentDistributionDto>>>;
}

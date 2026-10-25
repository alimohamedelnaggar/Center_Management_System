using System;
using System.Collections.Generic;
using System.Text;

namespace CenterManagement.Core.Features.Reports.Queries.GetStudentAttendanceReports
{
    public sealed record GetStudentAttendanceReportQuery(Guid StudentId, Guid? GroupId = null)
     : IRequest<Response<StudentAttendanceReportDto>>;
}

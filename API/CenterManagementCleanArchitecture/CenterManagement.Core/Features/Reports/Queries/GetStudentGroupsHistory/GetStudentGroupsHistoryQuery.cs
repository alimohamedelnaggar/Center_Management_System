using CenterManagement.Core.Features.Reports.Responses;

namespace CenterManagement.Core.Features.Reports.Queries.GetStudentGroupsHistory
{
    public sealed record GetStudentGroupsHistoryQuery(Guid StudentId)
        : IRequest<Response<List<StudentGroupHistoryDto>>>;
}

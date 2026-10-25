using CenterManagement.Core.Features.Exams.Queries.Results;

namespace CenterManagement.Core.Features.Exams.Queries.Models;

public class GetGroupSessionExamsQuery : IRequest<Response<List<ExamResponse>>>
{
    public Guid GroupId { get; set; }
    public Guid SessionId { get; set; }

}
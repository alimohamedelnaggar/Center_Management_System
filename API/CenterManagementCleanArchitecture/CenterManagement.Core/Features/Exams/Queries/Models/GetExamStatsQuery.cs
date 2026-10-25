using CenterManagement.Infrustructure.Results;

namespace CenterManagement.Core.Features.Exams.Queries.Models;


public class GetExamStatsQuery : IRequest<Response<ExamStatsDTO>>
{
    public Guid GroupId { get; set; }
    public Guid SessionId { get; set; }
    public Guid ExamId { get; set; }
}

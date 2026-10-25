using CenterManagement.Core.Features.Exams.Queries.Results;

namespace CenterManagement.Core.Features.Exams.Queries.Models;

public class GetExamGradesQuery : IRequest<Response<List<StudentExamGradeResponse>>>
{
    public Guid GroupId { get; set; }
    public Guid SessionId { get; set; }
    public Guid ExamId { get; set; }
}

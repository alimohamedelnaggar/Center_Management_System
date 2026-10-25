

namespace CenterManagement.Core.Features.Exams.Commands.Models;
public sealed record EditExamCommand : IRequest<Response<string>>
{
    public Guid GroupId { get; init; }
    public Guid SessionId { get; init; }
    public Guid ExamId { get; init; }
    public List<ExamComponentDto> Components { get; init; } = [];
    public List<StudentMarkDto> Students { get; init; } = [];
}

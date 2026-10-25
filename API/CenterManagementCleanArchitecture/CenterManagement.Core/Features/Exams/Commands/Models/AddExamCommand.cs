

namespace CenterManagement.Core.Features.Exams.Commands.Models;

public sealed record AddExamCommand : IRequest<Response<string>>
{
    public string Name { get; init; } = default!;
    public Guid GroupId { get; init; }
    public Guid SessionId { get; init; }
    public DateTime ExamDate { get; init; }
    public List<ExamComponentDto> Components { get; init; } = [];
    public List<StudentMarkDto> Students { get; init; } = [];

}
public sealed record ExamComponentDto
{
    public ExamType Type { get; init; }
    public decimal TotalMarks { get; init; }
}
public sealed record StudentMarkDto
{
    public Guid StudentId { get; init; }
    public List<ComponentMarkDto> Marks { get; init; } = [];
}
public sealed record ComponentMarkDto
{
    public ExamType Type { get; init; }
    public decimal Mark { get; init; }
}
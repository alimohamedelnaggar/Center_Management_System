namespace CenterManagement.Core.Features.Exams.Queries.Results;

public record ExamResponse
{
    public Guid Id { get; set; }
    public string Name { get; set; }

}

namespace CenterManagement.Core.Features.AttendenceFeature.Queries.Models;

public record GetRunningSessionsQuery : IRequest<Response<List<RunningSessionDTO>>>
{
    public DateOnly? Date { get; init; }
}

public record RunningSessionDTO
{
    public Guid SessionId { get; set; }
    public Guid GroupId { get; set; }
    public string GroupName { get; set; } = string.Empty;
    public DayOfWeek DayOfWeek { get; set; }
    public TimeOnly StartTime { get; set; }
    public TimeOnly EndTime { get; set; }
    public int StudentsCount { get; set; }
}
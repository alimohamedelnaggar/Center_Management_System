namespace CenterManagement.Core.Features.AttendenceFeature.Queries.Models;

public record GetStudentsForTakeAttendenceQuery : IRequest<Response<PagedResult<StudentAttendenceDTO>>>
{
    public int PageIndex { get; init; } = 1;
    public int PageSize { get; init; } = 10;

    public string? Search { get; init; }
    public Guid GroupId { get; init; }
    public Guid SessionId { get; init; }
    public DateOnly AttendanceDate { get; init; }
}

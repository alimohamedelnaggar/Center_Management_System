using CenterManagement.Core.Features.UsersFeature.Students.Queries.Results;

public record GetStudentsPaginatedQuery : IRequest<Response<PagedResult<StudentPagedDTO>>>
{
    public int PageIndex { get; init; } = 1;
    public int PageSize { get; init; } = 10;

    public string? Search { get; init; }
    public bool? IsActive { get; init; }
    public Guid? GroupId { get; init; }
}
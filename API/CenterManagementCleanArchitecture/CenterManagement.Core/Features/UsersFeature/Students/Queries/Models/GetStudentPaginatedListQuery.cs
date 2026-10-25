using CenterManagement.Core.Features.UsersFeature.Students.Queries.Results;

public class GetStudentPaginatedListQuery : IRequest<PaginatedResult<GetStudentPaginatedListResponse>>
{
    public int PageNumber { get; set; }
    public int PageSize { get; set; }
    public StudentOrderingEnum OrderBy { get; set; }
    public string? Search { get; set; }
}

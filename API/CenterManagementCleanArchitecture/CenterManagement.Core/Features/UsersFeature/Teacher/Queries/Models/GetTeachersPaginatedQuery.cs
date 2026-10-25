using CenterManagement.Core.Features.UsersFeature.Teacher.Queries.Dtos;

namespace CenterManagement.Core.Features.UsersFeature.Teacher.Queries.Models;

public class GetTeachersPaginatedQuery : IRequest<Response<PaginatedResult<TeacherDto>>>
{
    public int PageNumber { get; set; } = 1;
    public int PageSize { get; set; } = 10;
    public string? Search { get; set; }

    /// <summary>Optional target center for privileged callers (Admin/SuperAdmin).</summary>
    public Guid? CenterId { get; set; }
}

using CenterManagement.Core.Features.UsersFeature.Students.Queries.Results;

namespace CenterManagement.Core.Features.UsersFeature.Students.Queries.Models
{
    public class GetStudentListQuery : IRequest<Response<List<GetStudentListResponse>>>
    {
    }
}

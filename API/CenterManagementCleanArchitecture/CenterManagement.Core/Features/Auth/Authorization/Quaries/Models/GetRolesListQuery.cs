using CenterManagement.Core.Features.Auth.Authorization.Quaries.Results;

namespace CenterManagement.Core.Features.Auth.Authorization.Quaries.Models
{
    public class GetRolesListQuery : IRequest<Response<List<GetRolesListResult>>>
    {
    }
}

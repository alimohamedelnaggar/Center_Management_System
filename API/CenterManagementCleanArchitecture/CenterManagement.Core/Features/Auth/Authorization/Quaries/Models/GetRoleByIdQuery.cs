using CenterManagement.Core.Features.Auth.Authorization.Quaries.Results;

namespace CenterManagement.Core.Features.Auth.Authorization.Quaries.Models
{
    public class GetRoleByIdQuery : IRequest<Response<GetRoleByIdResult>>
    {
        public int Id { get; set; }
    }
}

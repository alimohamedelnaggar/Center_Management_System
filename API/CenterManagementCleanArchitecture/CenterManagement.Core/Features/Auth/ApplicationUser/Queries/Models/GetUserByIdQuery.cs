
namespace CenterManagement.Core.Features.Auth.ApplicationUser.Queries.Models;

public class GetUserByIdQuery : IRequest<Response<GetUserByIdResponse>>
{
    public int Id { get; set; }
    public GetUserByIdQuery(int id)
    {
        Id = id;
    }
}

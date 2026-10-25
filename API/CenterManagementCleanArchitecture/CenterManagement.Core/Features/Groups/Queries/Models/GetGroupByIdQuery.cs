

namespace CenterManagement.Core.Features.Groups.Queries.Models;

public class GetGroupByIdQuery : IRequest<Response<GetGroupByIdResponse>>
{
    public Guid Id { get; set; }

    public GetGroupByIdQuery(Guid id)
    {
        Id = id;
    }

    public GetGroupByIdQuery() { }
}

using CenterManagement.Core.Bases;
using MediatR;

namespace CenterManagement.Core.Features.Centers.Queries.Models;

public class GetMyCentersQuery : IRequest<Response<List<CenterDto>>>
{
}

using CenterManagement.Core.Bases;
using MediatR;

namespace CenterManagement.Core.Features.Centers.Queries.Models;

/// <summary>
/// Returns the center the current user belongs to (his tenant), used to
/// white-label the site (name, logo, theme color).
/// </summary>
public class GetMyCenterQuery : IRequest<Response<CenterDto>>
{
}

using CenterManagement.Core.Bases;
using MediatR;

namespace CenterManagement.Core.Features.Centers.Queries.Models;

/// <summary>Full details of a single center (SuperAdmin only).</summary>
public class GetCenterByIdQuery : IRequest<Response<CenterDetailsDto>>
{
    public Guid Id { get; set; }
}

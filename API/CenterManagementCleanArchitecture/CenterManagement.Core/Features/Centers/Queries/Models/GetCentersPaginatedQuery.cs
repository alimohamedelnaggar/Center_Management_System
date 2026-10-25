using CenterManagement.Core.Bases;
using CenterManagement.Core.Wrappers;
using MediatR;

namespace CenterManagement.Core.Features.Centers.Queries.Models;

/// <summary>Paginated list of every center on the platform (SuperAdmin only).</summary>
public class GetCentersPaginatedQuery : IRequest<Response<PaginatedResult<CenterListItemDto>>>
{
    public int PageNumber { get; set; } = 1;

    public int PageSize { get; set; } = 10;

    /// <summary>Free text matched against the center name, phone or owner.</summary>
    public string? Search { get; set; }

    /// <summary>Optional <c>Active</c>, <c>Suspended</c> or <c>Expired</c>.</summary>
    public string? Status { get; set; }

    /// <summary>Optional <c>MultiTeacher</c> or <c>SoloTeacher</c>.</summary>
    public string? Type { get; set; }
}

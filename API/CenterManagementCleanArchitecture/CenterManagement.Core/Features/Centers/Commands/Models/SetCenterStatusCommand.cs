using CenterManagement.Core.Bases;
using CenterManagement.Data.Enums;
using MediatR;

namespace CenterManagement.Core.Features.Centers.Commands.Models;

/// <summary>Suspends or reactivates a center. SuperAdmin only.</summary>
public class SetCenterStatusCommand : IRequest<Response<string>>
{
    public Guid Id { get; set; }

    /// <summary>Only <see cref="CenterStatus.Active"/> (activate) or
    /// <see cref="CenterStatus.Suspended"/> (suspend) are accepted.</summary>
    public CenterStatus Status { get; set; }
}

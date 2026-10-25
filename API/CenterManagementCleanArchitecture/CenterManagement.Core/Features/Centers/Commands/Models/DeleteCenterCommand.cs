using CenterManagement.Core.Bases;
using MediatR;

namespace CenterManagement.Core.Features.Centers.Commands.Models;

/// <summary>Soft deletes a center. SuperAdmin only.</summary>
public class DeleteCenterCommand : IRequest<Response<string>>
{
    public Guid Id { get; set; }

    public DeleteCenterCommand(Guid id)
    {
        Id = id;
    }
}

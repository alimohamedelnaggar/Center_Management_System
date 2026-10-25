using CenterManagement.Core.Bases;
using MediatR;

namespace CenterManagement.Core.Features.Centers.Commands.Models;

public class AddCenterCommand : IRequest<Response<string>>
{
    public string Name { get; set; } = default!;
    public string? Phone { get; set; }
    public string? Address { get; set; }
    public string? Description { get; set; }
    public Guid? OwnerId { get; set; }
}

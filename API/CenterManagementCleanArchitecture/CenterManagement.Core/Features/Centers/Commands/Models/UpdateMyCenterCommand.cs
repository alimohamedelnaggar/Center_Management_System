using CenterManagement.Core.Bases;
using MediatR;

namespace CenterManagement.Core.Features.Centers.Commands.Models;

/// <summary>
/// Updates the branding/data of the current user's center.
/// Center owners update their own center; Admin/SuperAdmin may target a
/// specific center through <see cref="CenterId"/>.
/// </summary>
public class UpdateMyCenterCommand : IRequest<Response<string>>
{
    public Guid? CenterId { get; set; }
    public string Name { get; set; } = default!;
    public string? Phone { get; set; }
    public string? Address { get; set; }
    public string? Description { get; set; }
    public string? LogoUrl { get; set; }
    public string? ThemeColor { get; set; }
}

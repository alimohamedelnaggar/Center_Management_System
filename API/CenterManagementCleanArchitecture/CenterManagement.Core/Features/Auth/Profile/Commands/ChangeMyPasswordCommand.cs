using CenterManagement.Core.Bases;
using MediatR;

namespace CenterManagement.Core.Features.Auth.Profile.Command.Models;

public class ChangeMyPasswordCommand : IRequest<Response<JwtAuthResult>>
{
    public string CurrentPassword { get; set; } = string.Empty;

    public string NewPassword { get; set; } = string.Empty;

    public string ConfirmPassword { get; set; } = string.Empty;
}

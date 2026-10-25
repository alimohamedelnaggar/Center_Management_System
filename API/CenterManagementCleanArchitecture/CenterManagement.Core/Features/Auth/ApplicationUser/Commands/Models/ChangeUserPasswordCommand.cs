
namespace CenterManagement.Core.Features.Auth.ApplicationUser.Commands.Models;

public class ChangeUserPasswordCommand : IRequest<Response<string>>
{
    public Guid Id { get; set; }
    public string CurrentPassword { get; set; }
    public string NewPassword { get; set; }
    public string ConfirmPassword { get; set; }
}

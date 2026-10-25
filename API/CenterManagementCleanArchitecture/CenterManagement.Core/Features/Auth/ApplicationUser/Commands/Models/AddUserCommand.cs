namespace CenterManagement.Core.Features.Auth.ApplicationUser.Commands.Models;

public class AddUserCommand : IRequest<Response<string>>
{
    public string FullName { get; set; }

    public string Email { get; set; }

    public string PhoneNumber { get; set; }

    public string Password { get; set; }

    public string ConfirmPassword { get; set; }

    public string Role { get; set; }

    public bool AcceptTerms { get; set; }

}

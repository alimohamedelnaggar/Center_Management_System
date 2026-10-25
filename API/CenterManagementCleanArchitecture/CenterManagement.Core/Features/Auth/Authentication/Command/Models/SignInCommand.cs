namespace CenterManagement.Core.Features.Auth.Authentication.Command.Models;

public sealed class SignInCommand : IRequest<Response<JwtAuthResult>>
{
    public string PhoneNumber { get; set; } = default!;
    public string Password { get; set; } = default!;
}

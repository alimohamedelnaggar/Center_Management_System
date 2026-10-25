namespace CenterManagement.Core.Features.Auth.Authorization.Commands.Models;



public record LoginResponse(
    bool IsAuthenticated,
    string Message,
    string? Token = null,
    DateTime? Expiration = null);



public record LoginCommand(string Email,
    string Password) : IRequest<LoginResponse>;


namespace CenterManagement.Core.Features.Auth.ApplicationUser.Commands.Models;

public record DeleteUserCommand(Guid Id) : IRequest<Response<string>>;


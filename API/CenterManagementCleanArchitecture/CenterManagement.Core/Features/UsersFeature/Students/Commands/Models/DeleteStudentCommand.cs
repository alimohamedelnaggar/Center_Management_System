namespace CenterManagement.Core.Features.UsersFeature.Students.Commands.Models;

public record DeleteStudentCommand(Guid Id) : IRequest<Response<string>>;
namespace CenterManagement.Core.Features.UsersFeature.Students.Commands.Models;

public record ChangeStatusStudentCommand(Guid Id) : IRequest<Response<string>>;

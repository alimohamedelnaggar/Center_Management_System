namespace CenterManagement.Core.Features.UsersFeature.Students.Commands.Models;

public record ChangePaymentStatusStudentCommand(Guid Id) : IRequest<Response<string>>;

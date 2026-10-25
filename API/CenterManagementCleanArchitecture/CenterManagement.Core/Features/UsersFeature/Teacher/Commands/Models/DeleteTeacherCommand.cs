namespace CenterManagement.Core.Features.UsersFeature.Teacher.Commands.Models;

public class DeleteTeacherCommand : IRequest<Response<string>>
{
    public Guid Id { get; set; }
}

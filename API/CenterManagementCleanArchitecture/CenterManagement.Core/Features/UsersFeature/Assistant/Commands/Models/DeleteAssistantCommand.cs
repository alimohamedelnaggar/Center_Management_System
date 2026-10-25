using CenterManagement.Core.Bases;

namespace CenterManagement.Core.Features.UsersFeature.Assistant.Commands.Models;

public class DeleteAssistantCommand : IRequest<Response<string>>
{
    public Guid Id { get; set; }
}
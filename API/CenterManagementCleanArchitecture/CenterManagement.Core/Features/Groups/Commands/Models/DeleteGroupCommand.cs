

namespace CenterManagement.Core.Features.Groups.Commands.Models
{
    public class DeleteGroupCommand : IRequest<Response<string>>
    {
        public Guid Id { get; set; }

        public DeleteGroupCommand(Guid id)
        {
            Id = id;
        }

        public DeleteGroupCommand() { }
    }
}

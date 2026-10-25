using CenterManagement.Infrustructure.InfrastructureBases.Bases;

namespace CenterManagement.Core.Features.Exams.Commands.Models;

public class UpdateParentContactCommand : IRequest<Response<bool>>
{
    public Guid StudentId { get; set; }
    public Guid ExamId { get; set; }
}
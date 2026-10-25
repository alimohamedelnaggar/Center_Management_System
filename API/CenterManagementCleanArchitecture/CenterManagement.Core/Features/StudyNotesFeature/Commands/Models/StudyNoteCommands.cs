namespace CenterManagement.Core.Features.StudyNotesFeature.Commands.Models;

public class CreateStudyNoteCommand : IRequest<Response<Guid>>
{
    public string Title { get; set; } = default!;
    public string? Description { get; set; }
    public List<Guid> GroupIds { get; set; } = new();
    public IFormFile File { get; set; } = default!;
}

public class DeleteStudyNoteCommand : IRequest<Response<string>>
{
    public Guid Id { get; set; }

    public DeleteStudyNoteCommand(Guid id)
    {
        Id = id;
    }
}

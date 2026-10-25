namespace CenterManagement.Core.Features.StudyNotesFeature.Dtos;

public class StudyNoteDTO
{
    public Guid Id { get; set; }
    public string Title { get; set; } = default!;
    public string? Description { get; set; }
    public string FileName { get; set; } = default!;
    public string OriginalFileName { get; set; } = default!;
    public long FileSize { get; set; }
    public DateTime CreatedAt { get; set; }
    public List<Guid> GroupIds { get; set; } = new();
    public List<string> GroupNames { get; set; } = new();
}

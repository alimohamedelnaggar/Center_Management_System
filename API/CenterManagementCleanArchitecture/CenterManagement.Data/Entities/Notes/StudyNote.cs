namespace CenterManagement.Data.Entities.Notes;

public class StudyNote : BaseEntity, ITenantEntity
{
    public string Title { get; set; } = default!;

    public string? Description { get; set; }

    // Stored file name on disk (guid + extension).
    public string FileName { get; set; } = default!;

    // Original file name as uploaded, used for download.
    public string OriginalFileName { get; set; } = default!;

    public long FileSize { get; set; }

    public Guid? UploadedBy { get; set; }

    public ICollection<StudyNoteGroup> StudyNoteGroups { get; set; } = [];

    public Guid? CenterId { get; set; }
}

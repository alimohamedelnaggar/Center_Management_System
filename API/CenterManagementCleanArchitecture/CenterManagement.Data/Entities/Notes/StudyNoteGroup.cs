using CenterManagement.Data.Entities.Groups;

namespace CenterManagement.Data.Entities.Notes;

public class StudyNoteGroup : ITenantEntity
{
    public Guid StudyNoteId { get; set; }
    public StudyNote StudyNote { get; set; } = default!;

    public Guid GroupId { get; set; }
    public Group Group { get; set; } = default!;

    public Guid? CenterId { get; set; }
}

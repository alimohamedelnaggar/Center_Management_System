using CenterManagement.Core.Features.StudyNotesFeature.Dtos;

namespace CenterManagement.Core.Features.StudyNotesFeature.Queries.Models;

public class GetStudyNotesPaginatedQuery : IRequest<Response<PaginatedResult<StudyNoteDTO>>>
{
    public int PageNumber { get; set; } = 1;
    public int PageSize { get; set; } = 10;
    public string? Search { get; set; }
    public Guid? GroupId { get; set; }
}

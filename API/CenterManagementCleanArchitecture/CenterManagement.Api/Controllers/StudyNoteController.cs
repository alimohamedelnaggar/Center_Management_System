using CenterManagement.Core.Features.StudyNotesFeature.Commands.Models;
using CenterManagement.Core.Features.StudyNotesFeature.Queries.Models;

namespace CenterManagement.Api.Controllers;

[Authorize(Policy = AppPolicies.Operational)]
[RequireModule(ModuleKeys.StudyNotes)]
public class StudyNoteController : AppControllerBase
{
    #region Create
    [HttpPost(Routing.StudyNoteRoute.Create)]
    public async Task<IActionResult> Create([FromForm] CreateStudyNoteCommand command)
    {
        var result = await _mediator.Send(command);

        return NewResult(result);
    }
    #endregion

    #region Paginated
    [HttpGet(Routing.StudyNoteRoute.Paginated)]
    public async Task<IActionResult> Paginated([FromQuery] GetStudyNotesPaginatedQuery query)
    {
        var result = await _mediator.Send(query);

        return NewResult(result);
    }
    #endregion

    #region Delete
    [HttpDelete(Routing.StudyNoteRoute.Delete)]
    public async Task<IActionResult> Delete(Guid id)
    {
        var result = await _mediator.Send(new DeleteStudyNoteCommand(id));

        return NewResult(result);
    }
    #endregion
}

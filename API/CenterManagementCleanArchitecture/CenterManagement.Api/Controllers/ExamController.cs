using CenterManagement.Core.Features.Exams.Commands.Models;
using CenterManagement.Core.Features.Exams.Queries.Models;


namespace CenterManagement.Api.Controllers;

[Authorize(Policy = AppPolicies.Operational)]
[RequireModule(ModuleKeys.Grades)]
public class ExamController : AppControllerBase
{
    #region Create
    [HttpPost(Routing.ExamRoute.Create)]
    public async Task<IActionResult> Add(AddExamCommand command)
    {
        var result = await _mediator.Send(command);

        return NewResult(result);
    }
    #endregion

    #region Edit
    [HttpPut(Routing.ExamRoute.Edit)]
    public async Task<IActionResult> Edit(EditExamCommand command)
    {
        var result = await _mediator.Send(command);

        return NewResult(result);
    }
    #endregion

    #region Read
    [HttpGet(Routing.ExamRoute.Stats)]
    public async Task<IActionResult> GetStats([FromQuery] GetExamStatsQuery query)
    {
        var result = await _mediator.Send(query);
        return NewResult(result);
    }
    [HttpGet(Routing.ExamRoute.GroupSessionExams)]
    public async Task<IActionResult> GroupSessionExams(Guid groupId, Guid sessionId)
    {
        var result = await _mediator.Send(new GetGroupSessionExamsQuery
        {
            SessionId = sessionId,
            GroupId = groupId
        });
        return NewResult(result);
    }
    [HttpGet(Routing.ExamRoute.GetExamGrades)]
    public async Task<IActionResult> GetExamGrades(Guid groupId, Guid sessionId, Guid examId)
    {
        var result = await _mediator.Send(new GetExamGradesQuery
        {
            ExamId = examId,
            GroupId = groupId,
            SessionId = sessionId
        });
        return NewResult(result);
    }
    #endregion

    #region Delete
    [HttpDelete(Routing.ExamRoute.Delete)]
    public async Task<IActionResult> Delete(Guid id)
    {
        var result = await _mediator.Send(new DeleteExamCommand(id));

        return NewResult(result);
    }
    #endregion

    [HttpPut(Routing.ExamRoute.UpdateParentContact)]
    public async Task<IActionResult> UpdateParentContact(
    [FromBody] UpdateParentContactCommand command)
    {
        var response = await _mediator.Send(command);

        return NewResult(response);
    }

}
using CenterManagement.Core.Features.QuestionExamFeature.Commands.Models;
using CenterManagement.Core.Features.QuestionExamFeature.Dtos;
using CenterManagement.Core.Features.QuestionExamFeature.Queries.Models;

namespace CenterManagement.Api.Controllers;

[Authorize(Policy = AppPolicies.Operational)]
[RequireModule(ModuleKeys.OnlineExams)]
public class QuestionExamController : AppControllerBase
{
    #region Create
    [HttpPost(Routing.QuestionExamRoute.Create)]
    public async Task<IActionResult> Create(CreateQuestionExamCommand command)
    {
        var result = await _mediator.Send(command);

        return NewResult(result);
    }
    #endregion

    #region Edit
    [HttpPut(Routing.QuestionExamRoute.Edit)]
    public async Task<IActionResult> Edit(EditQuestionExamCommand command)
    {
        var result = await _mediator.Send(command);

        return NewResult(result);
    }
    #endregion

    #region Read
    [HttpGet(Routing.QuestionExamRoute.Paginated)]
    public async Task<IActionResult> Paginated([FromQuery] GetQuestionExamsPaginatedQuery query)
    {
        var result = await _mediator.Send(query);

        return NewResult(result);
    }

    [HttpGet(Routing.QuestionExamRoute.GetByID)]
    public async Task<IActionResult> GetById(Guid id)
    {
        var result = await _mediator.Send(new GetQuestionExamByIdQuery { Id = id });

        return NewResult(result);
    }

    [HttpGet(Routing.QuestionExamRoute.Results)]
    public async Task<IActionResult> Results(Guid id)
    {
        var result = await _mediator.Send(new GetQuestionExamResultsQuery(id));

        return NewResult(result);
    }
    #endregion

    #region Delete
    [HttpDelete(Routing.QuestionExamRoute.Delete)]
    public async Task<IActionResult> Delete(Guid id)
    {
        var result = await _mediator.Send(new DeleteQuestionExamCommand(id));

        return NewResult(result);
    }
    #endregion

    #region Publish Results
    [HttpPost(Routing.QuestionExamRoute.PublishResults)]
    public async Task<IActionResult> PublishResults(Guid id, [FromQuery] bool publish = true)
    {
        var result = await _mediator.Send(new PublishQuestionExamResultsCommand(id, publish));

        return NewResult(result);
    }
    #endregion

    #region Essay Grading
    [HttpGet(Routing.QuestionExamRoute.AttemptDetail)]
    public async Task<IActionResult> AttemptDetail(Guid attemptId)
    {
        var result = await _mediator.Send(new GetQuestionExamAttemptDetailQuery(attemptId));

        return NewResult(result);
    }

    [HttpPost(Routing.QuestionExamRoute.GradeAttempt)]
    public async Task<IActionResult> GradeAttempt(
        Guid attemptId,
        [FromBody] List<GradeQuestionExamAnswerDTO> grades)
    {
        var result = await _mediator.Send(
            new GradeQuestionExamAttemptCommand(
                attemptId,
                grades ?? new List<GradeQuestionExamAnswerDTO>()));

        return NewResult(result);
    }
    #endregion
}

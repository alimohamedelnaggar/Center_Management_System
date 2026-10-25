using CenterManagement.Core.Features.QuestionBankFeature.Commands.Models;
using CenterManagement.Core.Features.QuestionBankFeature.Queries.Models;
using CenterManagement.Core.Features.Shared.UploadImage.Commands.Models;

namespace CenterManagement.Api.Controllers;

[Authorize(Policy = AppPolicies.Operational)]
[RequireModule(ModuleKeys.QuestionBank)]
public class QuestionBankController : AppControllerBase
{
    #region Create
    [HttpPost(Routing.QuestionBankRouting.Create)]
    public async Task<IActionResult> Create(AddQuestionBankCommand command)
    {
        var result = await _mediator.Send(command);

        return NewResult(result);
    }
    #endregion

    #region Edit
    [HttpPut(Routing.QuestionBankRouting.Edit)]
    public async Task<IActionResult> Edit(EditQuestionBankCommand command)
    {
        var result = await _mediator.Send(command);

        return NewResult(result);
    }
    #endregion

    #region Read
    [HttpGet(Routing.QuestionBankRouting.Paginated)]
    public async Task<IActionResult> Paginated([FromQuery] GetQuestionBanksPaginatedQuery query)
    {
        var result = await _mediator.Send(query);

        return NewResult(result);
    }

    [HttpGet(Routing.QuestionBankRouting.Questions)]
    public async Task<IActionResult> Questions(Guid bankId)
    {
        var result = await _mediator.Send(new GetQuestionBankQuestionsQuery
        {
            BankId = bankId
        });

        return NewResult(result);
    }
    #endregion

    #region Delete
    [HttpDelete(Routing.QuestionBankRouting.Delete)]
    public async Task<IActionResult> Delete(Guid id)
    {
        var result = await _mediator.Send(new DeleteQuestionBankCommand(id));

        return NewResult(result);
    }
    #endregion

    #region Question Commands
    [HttpPost(Routing.QuestionBankRouting.Prefix + "/questions")]
    public async Task<IActionResult> AddQuestion(AddQuestionCommand command)
    {
        var result = await _mediator.Send(command);

        return NewResult(result);
    }

    [HttpPut(Routing.QuestionBankRouting.Prefix + "/questions")]
    public async Task<IActionResult> EditQuestion(EditQuestionCommand command)
    {
        var result = await _mediator.Send(command);

        return NewResult(result);
    }

    [HttpDelete(Routing.QuestionBankRouting.Prefix + "/questions/{id}")]
    public async Task<IActionResult> DeleteQuestion(Guid id)
    {
        var result = await _mediator.Send(new DeleteQuestionCommand(id));

        return NewResult(result);
    }
    #endregion

    #region Image Upload
    [HttpPost(Routing.QuestionBankRouting.UploadImage)]
    public async Task<IActionResult> UploadQuestionImage(IFormFile imageFile)
    {
        var result = await _mediator.Send(new UploadImageCommand
        {
            ImageFile = imageFile,
            FolderName = "questions"
        });

        return NewResult(result);
    }
    #endregion
}
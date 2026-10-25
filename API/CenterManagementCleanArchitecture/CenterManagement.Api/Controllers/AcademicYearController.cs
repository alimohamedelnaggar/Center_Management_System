using CenterManagement.Core.Features.AcademicYearFeature.Commands.Models;
using CenterManagement.Core.Features.AcademicYearFeature.Queries.Models;

namespace CenterManagement.Api.Controllers;

[Authorize(Policy = AppPolicies.Operational)]
[RequireModule(ModuleKeys.QuestionBank)]
public class AcademicYearController : AppControllerBase
{
    #region Read
    [HttpGet(Routing.AcademicYearRouting.List)]
    public async Task<IActionResult> GetList()
    {
        var result = await _mediator.Send(new GetAcademicYearsQuery());

        return NewResult(result);
    }
    #endregion

    #region Create
    [HttpPost(Routing.AcademicYearRouting.Create)]
    public async Task<IActionResult> Create(AddAcademicYearCommand command)
    {
        var result = await _mediator.Send(command);

        return NewResult(result);
    }
    #endregion

    #region Edit
    [HttpPut(Routing.AcademicYearRouting.Edit)]
    public async Task<IActionResult> Edit(EditAcademicYearCommand command)
    {
        var result = await _mediator.Send(command);

        return NewResult(result);
    }
    #endregion

    #region Delete
    [HttpDelete(Routing.AcademicYearRouting.Delete)]
    public async Task<IActionResult> Delete(Guid id)
    {
        var result = await _mediator.Send(new DeleteAcademicYearCommand(id));

        return NewResult(result);
    }
    #endregion
}
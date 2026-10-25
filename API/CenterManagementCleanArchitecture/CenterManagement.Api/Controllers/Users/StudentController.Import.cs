using CenterManagement.Core.Features.UsersFeature.Students.Commands.Models.Import;
using Microsoft.AspNetCore.Mvc;

namespace CenterManagement.Api.Controllers.Users;

public partial class StudentController
{
    private const long MaxImportFileBytes = 10 * 1024 * 1024;

    [HttpGet(Routing.StudentRouting.ImportTemplate)]
    public async Task<IActionResult> ImportTemplate()
    {
        var response = await _mediator.Send(new GetStudentImportTemplateQuery());

        if (response.Data is null)
            return NewResult(response);

        return File(
            response.Data,
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "students-import-template.xlsx");
    }

    [HttpPost(Routing.StudentRouting.ImportPreview)]
    [RequestSizeLimit(MaxImportFileBytes)]
    public async Task<IActionResult> ImportPreview([FromForm] PreviewStudentImportCommand command)
    {
        var response = await _mediator.Send(command);
        return NewResult(response);
    }

    [HttpPost(Routing.StudentRouting.ImportCommit)]
    public async Task<IActionResult> ImportCommit([FromBody] CommitStudentImportCommand command)
    {
        var response = await _mediator.Send(command);
        return NewResult(response);
    }

    [HttpGet(Routing.StudentRouting.ImportErrorsReport)]
    public async Task<IActionResult> ImportErrorsReport([FromRoute] string sessionId)
    {
        var response = await _mediator.Send(new GetStudentImportErrorsReportQuery
        {
            SessionId = sessionId
        });

        if (response.Data is null)
            return NewResult(response);

        return File(
            response.Data,
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "students-import-errors.xlsx");
    }
}

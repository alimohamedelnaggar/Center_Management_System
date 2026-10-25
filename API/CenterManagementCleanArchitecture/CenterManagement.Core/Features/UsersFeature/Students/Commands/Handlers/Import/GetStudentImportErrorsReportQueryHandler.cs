using CenterManagement.Core.Bases;
using CenterManagement.Core.Features.UsersFeature.Students.Commands.Models.Import;
using CenterManagement.Core.Features.UsersFeature.Students.Services;
using ClosedXML.Excel;
using MediatR;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Localization;

namespace CenterManagement.Core.Features.UsersFeature.Students.Commands.Handlers.Import;

public class GetStudentImportErrorsReportQueryHandler : ResponseHandler,
    IRequestHandler<GetStudentImportErrorsReportQuery, Response<byte[]>>
{
    private readonly IImportSessionStore _sessionStore;
    private readonly IHttpContextAccessor _httpContextAccessor;

    public GetStudentImportErrorsReportQueryHandler(
        IImportSessionStore sessionStore,
        IHttpContextAccessor httpContextAccessor,
        IStringLocalizer<SharedResources> localizer) : base(localizer)
    {
        _sessionStore = sessionStore;
        _httpContextAccessor = httpContextAccessor;
    }

    public Task<Response<byte[]>> Handle(
        GetStudentImportErrorsReportQuery request,
        CancellationToken cancellationToken)
    {
        var user = _httpContextAccessor.HttpContext?.User;

        var userId = user?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
            ?? user?.FindFirst("uid")?.Value
            ?? "unknown";

        var centerClaim = user?.FindFirst("CenterId")?.Value;
        Guid.TryParse(centerClaim, out var centerId);

        var session = _sessionStore.GetSession(request.SessionId, userId, centerId);
        if (session is null)
            return Task.FromResult(BadRequest<byte[]>(
                "جلسة الاستيراد غير موجودة أو منتهية."));

        var errors = session.CommitResult?.Errors ?? new List<StudentImportError>();

        using var workbook = new XLWorkbook();
        var ws = workbook.Worksheets.Add("أخطاء الاستيراد");

        ws.Cell(1, 1).Value = "رقم الصف";
        ws.Cell(1, 2).Value = "الاسم";
        ws.Cell(1, 3).Value = "السبب";
        ws.Range("A1:C1").Style.Font.Bold = true;

        var row = 2;
        foreach (var error in errors)
        {
            ws.Cell(row, 1).Value = error.RowNumber;
            ws.Cell(row, 2).Value = error.FullName ?? string.Empty;
            ws.Cell(row, 3).Value = error.Reason;
            row++;
        }

        ws.Columns().AdjustToContents();

        using var ms = new MemoryStream();
        workbook.SaveAs(ms);

        return Task.FromResult(Success<byte[]>(ms.ToArray()));
    }
}

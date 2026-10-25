using CenterManagement.Core.Bases;
using CenterManagement.Core.Features.UsersFeature.Students.Commands.Models.Import;
using CenterManagement.Data.Entities.Abstractions;
using CenterManagement.Infrustructure.InfrastructureBases.Bases;
using ClosedXML.Excel;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Localization;

namespace CenterManagement.Core.Features.UsersFeature.Students.Commands.Handlers.Import;

public class GetStudentImportTemplateQueryHandler : ResponseHandler,
    IRequestHandler<GetStudentImportTemplateQuery, Response<byte[]>>
{
    private readonly IRepositoryManager _repositoryManager;
    private readonly IUserScopeService _scopeService;

    public GetStudentImportTemplateQueryHandler(
        IRepositoryManager repositoryManager,
        IUserScopeService scopeService,
        IStringLocalizer<SharedResources> localizer) : base(localizer)
    {
        _repositoryManager = repositoryManager;
        _scopeService = scopeService;
    }

    public async Task<Response<byte[]>> Handle(
        GetStudentImportTemplateQuery request,
        CancellationToken cancellationToken)
    {
        var scope = await _scopeService.ResolveAsync(cancellationToken);

        var groupsQuery = _repositoryManager.GroupRepository.GetTableNoTracking();
        if (!scope.CenterWide)
            groupsQuery = groupsQuery.Where(g => scope.GroupIds.Contains(g.Id));

        var groups = await groupsQuery
            .OrderBy(g => g.Name)
            .Select(g => new { g.Name, g.MonthlyPrice, g.SessionsPerMonth })
            .ToListAsync(cancellationToken);

        using var workbook = new XLWorkbook();
        var ws = workbook.Worksheets.Add("الطلاب");
        // Headers
        ws.Cell(1, 1).Value = "الاسم الكامل";
        ws.Cell(1, 2).Value = "رقم الهاتف";
        ws.Cell(1, 3).Value = "رقم هاتف ولي الأمر";
        ws.Cell(1, 4).Value = "اسم المجموعة";
        ws.Cell(1, 5).Value = "نوع الاشتراك (شهر/حصة)";
        ws.Cell(1, 6).Value = "سعر مخصص";
        ws.Cell(1, 7).Value = "المدرسة";
        ws.Cell(1, 8).Value = "ملاحظات";
        // Example row (deleted by the user before filling the real data).
        ws.Cell(2, 1).Value = "أحمد محمد";
        ws.Cell(2, 2).Value = "01012345678";
        ws.Cell(2, 3).Value = "01098765432";
        ws.Cell(2, 4).Value = groups.FirstOrDefault()?.Name ?? "المجموعة الأولى";
        ws.Cell(2, 5).Value = "شهر";
        ws.Cell(2, 6).Value = "";
        ws.Cell(2, 7).Value = "";
        ws.Cell(2, 8).Value = "";
        ws.Range("A1:H1").Style.Font.Bold = true;
        ws.Columns().AdjustToContents();

        // Second sheet: the groups the user is allowed to import into, so the
        // names can be copied verbatim (matching is case-insensitive).
        var groupsSheet = workbook.Worksheets.Add("المجموعات");
        groupsSheet.Cell(1, 1).Value = "اسم المجموعة";
        groupsSheet.Cell(1, 2).Value = "السعر الشهري";
        groupsSheet.Cell(1, 3).Value = "عدد الحصص";
        groupsSheet.Range("A1:C1").Style.Font.Bold = true;

        var row = 2;
        foreach (var group in groups)
        {
            groupsSheet.Cell(row, 1).Value = group.Name;
            groupsSheet.Cell(row, 2).Value = group.MonthlyPrice;
            groupsSheet.Cell(row, 3).Value = group.SessionsPerMonth;
            row++;
        }
        groupsSheet.Columns().AdjustToContents();

        using var ms = new MemoryStream();
        workbook.SaveAs(ms);
        return Success<byte[]>(ms.ToArray());
    }
}

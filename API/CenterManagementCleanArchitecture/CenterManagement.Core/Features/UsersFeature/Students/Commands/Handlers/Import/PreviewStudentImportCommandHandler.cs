using CenterManagement.Core.Bases;
using CenterManagement.Core.Features.Shared.Phone;
using CenterManagement.Core.Features.UsersFeature.Students.Commands.Models.Import;
using CenterManagement.Core.Features.UsersFeature.Students.Services;
using CenterManagement.Data.AppMetaData;
using CenterManagement.Data.Entities.Abstractions;
using CenterManagement.Infrustructure.Data;
using CenterManagement.Infrustructure.InfrastructureBases.Bases;
using ClosedXML.Excel;
using MediatR;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Localization;

namespace CenterManagement.Core.Features.UsersFeature.Students.Commands.Handlers.Import;

public class PreviewStudentImportCommandHandler : ResponseHandler,
    IRequestHandler<PreviewStudentImportCommand, Response<StudentImportPreviewResult>>
{
    private readonly IRepositoryManager _repositoryManager;
    private readonly IUserScopeService _scopeService;
    private readonly IImportSessionStore _sessionStore;
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly AppDbContext _dbContext;

    public PreviewStudentImportCommandHandler(
        IRepositoryManager repositoryManager,
        IUserScopeService scopeService,
        IImportSessionStore sessionStore,
        IHttpContextAccessor httpContextAccessor,
        AppDbContext dbContext,
        IStringLocalizer<SharedResources> localizer) : base(localizer)
    {
        _repositoryManager = repositoryManager;
        _scopeService = scopeService;
        _sessionStore = sessionStore;
        _httpContextAccessor = httpContextAccessor;
        _dbContext = dbContext;
    }

    public async Task<Response<StudentImportPreviewResult>> Handle(PreviewStudentImportCommand request, CancellationToken cancellationToken)
    {
        var file = request.File;
        if (file == null || file.Length == 0)
            return BadRequest<StudentImportPreviewResult>("يرجى رفع ملف Excel");

        // Check extension
        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (ext != ".xlsx")
            return BadRequest<StudentImportPreviewResult>("يجب أن يكون الملف بصيغة xlsx فقط");

        // Check magic bytes
        using (var msCheck = new MemoryStream())
        {
            await file.CopyToAsync(msCheck, cancellationToken);
            var bytes = msCheck.ToArray();
            if (bytes.Length < 4) return BadRequest<StudentImportPreviewResult>("ملف غير صالح");
            // PKZIP
            if (!(bytes[0] == 0x50 && bytes[1] == 0x4B && bytes[2] == 0x03 && bytes[3] == 0x04))
                return BadRequest<StudentImportPreviewResult>("ملف غير صالح أو ليس xlsx");
            // Reset position by reading again
        }

        var scope = await _scopeService.ResolveAsync(cancellationToken);
        var userId = _httpContextAccessor.HttpContext?.User?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
            ?? _httpContextAccessor.HttpContext?.User?.FindFirst("uid")?.Value
            ?? "unknown";
        var centerId = _httpContextAccessor.HttpContext?.User?.FindFirst("CenterId")?.Value;
        Guid.TryParse(centerId, out var cId);

        // Read file
        using var stream = file.OpenReadStream();
        XLWorkbook workbook;
        try
        {
            workbook = new XLWorkbook(stream);
        }
        catch
        {
            return BadRequest<StudentImportPreviewResult>(
                "تعذر قراءة الملف. تأكد أنه ملف Excel xlsx صالح.");
        }

        using (workbook)
        {
            var ws = workbook.Worksheet(1);
            var rows = ws.RangeUsed()?.RowsUsed().Skip(1).ToList() ?? new List<IXLRangeRow>(); // skip header
            if (rows.Count > 2000)
                return BadRequest<StudentImportPreviewResult>("عدد الصفوف يتجاوز الحد المسموح به 2000");

            return await PreviewRowsAsync(
                rows, scope, userId, cId, cancellationToken);
        }
    }

    private async Task<Response<StudentImportPreviewResult>> PreviewRowsAsync(
        List<IXLRangeRow> rows,
        UserScope scope,
        string userId,
        Guid cId,
        CancellationToken cancellationToken)
    {

        var resultRows = new List<StudentImportRow>();
        var filePhones = new HashSet<string>(StringComparer.Ordinal);

        // Load groups in scope
        var groupsQuery = _repositoryManager.GroupRepository.GetTableNoTracking();
        if (cId != Guid.Empty)
            groupsQuery = groupsQuery.Where(g => g.CenterId == cId);
        if (!scope.CenterWide)
        {
            groupsQuery = groupsQuery.Where(g => scope.GroupIds.Contains(g.Id));
        }
        var groups = await groupsQuery.ToListAsync(cancellationToken);
        var groupByName = groups.ToDictionary(g => g.Name.Trim(), g => g, StringComparer.OrdinalIgnoreCase);

        // Phone uniqueness is enforced at the center level for the whole import.
        // The user's scope only restricts which groups they may target, not
        // whether a phone already exists anywhere in the center. We still need the
        // in-scope flag so an out-of-scope duplicate never offers "update".
        var studentsQuery = _repositoryManager.StudentRepository.GetTableNoTracking();
        if (cId != Guid.Empty)
        {
            studentsQuery = studentsQuery.Where(s => s.CenterId == cId);
        }

        List<ExistingPhone> existingPhones;
        if (scope.CenterWide)
        {
            existingPhones = await studentsQuery
                .Select(s => new ExistingPhone { Phone = s.PhoneNumber, InScope = true })
                .ToListAsync(cancellationToken);
        }
        else
        {
            var groupIds = scope.GroupIds;
            existingPhones = await studentsQuery
                .Select(s => new ExistingPhone
                {
                    Phone = s.PhoneNumber,
                    InScope = s.StudentGroups.Any(
                        sg => groupIds.Contains(sg.GroupId) && sg.IsActive && sg.LeftAt == null)
                })
                .ToListAsync(cancellationToken);
        }

        // The values already stored may predate normalization, so normalize them
        // the same way as the file before comparing (otherwise "+2010…" would not
        // match a legacy "010…" row).
        var existingPhoneIndex = BuildExistingPhoneIndex(existingPhones);

        // A phone that belongs to a non-student account (teacher, assistant,
        // parent, owner, student login) is reserved for the whole center.
        var userPhonesQuery = _dbContext.Users.AsNoTracking();
        if (cId != Guid.Empty)
            userPhonesQuery = userPhonesQuery.Where(u => u.CenterId == cId);
        var userPhones = await userPhonesQuery
            .Select(u => u.PhoneNumber)
            .ToListAsync(cancellationToken);

        MergeReservedUserPhones(existingPhoneIndex, userPhones);

        int rowNum = 1;
        foreach (var r in rows)
        {
            rowNum++;
            var importRow = new StudentImportRow { RowNumber = rowNum };
            try
            {
                // Read values only (no formulas) - ClosedXML reads values
                var fullName = r.Cell(1).GetString().Trim();
                var phone = r.Cell(2).GetString();
                var phoneParent = r.Cell(3).GetString();
                var groupName = r.Cell(4).GetString().Trim();
                var subType = r.Cell(5).GetString().Trim();
                var customPrice = r.Cell(6).GetString().Trim();
                var school = r.Cell(7).GetString().Trim();
                var notes = r.Cell(8).GetString().Trim();

                importRow.FullName = fullName;
                importRow.Phone = phone;
                importRow.PhoneParent = phoneParent;
                importRow.GroupName = groupName;
                importRow.SubscriptionType = subType;
                importRow.CustomMonthlyPrice = customPrice;
                importRow.School = school;
                importRow.Notes = notes;

                if (string.IsNullOrWhiteSpace(fullName))
                    importRow.Errors.Add("الاسم الكامل مطلوب");

                if (!PhoneNormalizer.TryNormalize(phone, out var pNorm, out var pErr))
                    importRow.Errors.Add(pErr ?? "رقم الهاتف غير صالح");
                else
                    importRow.PhoneNormalized = pNorm;

                if (!PhoneNormalizer.TryNormalize(phoneParent, out var ppNorm, out var ppErr))
                    importRow.Errors.Add(ppErr ?? "رقم هاتف ولي الأمر غير صالح");
                else
                    importRow.PhoneParentNormalized = ppNorm;

                if (string.IsNullOrWhiteSpace(groupName))
                {
                    importRow.Errors.Add("اسم المجموعة مطلوب");
                }
                else if (groupByName.TryGetValue(groupName, out var group))
                {
                    importRow.GroupId = group.Id.ToString();
                }
                else if (scope.CenterWide)
                {
                    // A center-wide user may create the missing group on commit.
                    importRow.GroupWillBeCreated = true;
                }
                else
                {
                    importRow.Errors.Add("المجموعة غير موجودة أو خارج نطاقك");
                }

                // Duplicate checks
                if (importRow.PhoneNormalized != null)
                {
                    if (!filePhones.Add(importRow.PhoneNormalized))
                        importRow.IsDuplicateInFile = true;

                    if (existingPhoneIndex.TryGetValue(
                        importRow.PhoneNormalized, out var existingInScope))
                    {
                        importRow.IsDuplicateInDb = true;
                        importRow.CanUpdate = existingInScope;
                    }
                }
                if (importRow.IsDuplicateInFile || importRow.IsDuplicateInDb)
                    importRow.Errors.Add("رقم الهاتف مكرر");

                importRow.IsValid = importRow.Errors.Count == 0;
            }
            catch (Exception ex)
            {
                importRow.Errors.Add("خطأ في قراءة الصف");
                importRow.IsValid = false;
            }
            resultRows.Add(importRow);
        }

        var preview = new StudentImportPreviewResult
        {
            SessionId = string.Empty,
            TotalRows = resultRows.Count,
            ValidRows = resultRows.Count(r => r.IsValid),
            DuplicateInFile = resultRows.Count(r => r.IsDuplicateInFile),
            DuplicateInDb = resultRows.Count(r => r.IsDuplicateInDb),
            ErrorRows = resultRows.Count(r => !r.IsValid),
            Rows = resultRows,
            Headers = new List<string> { "الاسم الكامل", "رقم الهاتف", "رقم هاتف ولي الأمر", "اسم المجموعة", "نوع الاشتراك", "سعر مخصص", "المدرسة", "ملاحظات" }
        };

        var session = new StudentImportSession
        {
            UserId = userId,
            CenterId = cId,
            Rows = resultRows
        };
        preview.SessionId = _sessionStore.CreateSession(userId, cId, session);

        return Success(preview);
    }

    private sealed class ExistingPhone
    {
        public string? Phone { get; set; }
        public bool InScope { get; set; }
    }

    /// <summary>
    /// Normalizes every stored phone the same way as an imported one. Values that
    /// cannot be normalized are kept trimmed so an exact-match legacy duplicate is
    /// still detected. When the same phone belongs to several rows, any in-scope
    /// match wins so "update" is only offered when the user may touch it.
    /// </summary>
    private static Dictionary<string, bool> BuildExistingPhoneIndex(
        IEnumerable<ExistingPhone> storedPhones)
    {
        var index = new Dictionary<string, bool>(StringComparer.Ordinal);

        foreach (var row in storedPhones)
        {
            if (string.IsNullOrWhiteSpace(row.Phone))
                continue;

            var key = PhoneNormalizer.TryNormalize(row.Phone, out var normalized, out _)
                ? normalized
                : row.Phone.Trim();

            index[key] = index.TryGetValue(key, out var previous)
                ? previous || row.InScope
                : row.InScope;
        }

        return index;
    }

    /// <summary>
    /// Non-student accounts reserve their phone but can never be "updated" by the
    /// import. A phone that also belongs to an in-scope student keeps its existing
    /// in-scope flag so update mode still works for the student.
    /// </summary>
    private static void MergeReservedUserPhones(
        Dictionary<string, bool> index,
        IEnumerable<string?> userPhones)
    {
        foreach (var raw in userPhones)
        {
            if (string.IsNullOrWhiteSpace(raw))
                continue;

            var key = PhoneNormalizer.TryNormalize(raw, out var normalized, out _)
                ? normalized
                : raw.Trim();

            if (!index.ContainsKey(key))
                index[key] = false;
        }
    }
}

using CenterManagement.Core.Bases;
using CenterManagement.Core.Features.ParentPortalFeature.Services;
using CenterManagement.Core.Features.Shared.Phone;
using CenterManagement.Core.Features.UsersFeature.Students.Commands.Models;
using CenterManagement.Core.Features.UsersFeature.Students.Commands.Models.Import;
using CenterManagement.Core.Features.UsersFeature.Students.Services;
using CenterManagement.Data.Entities.Groups;
using CenterManagement.Data.Entities.Users;
using CenterManagement.Data.Enums;
using CenterManagement.Data.Results;
using CenterManagement.Infrustructure.Data;
using CenterManagement.Infrustructure.InfrastructureBases.Bases;
using MediatR;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Localization;

namespace CenterManagement.Core.Features.UsersFeature.Students.Commands.Handlers.Import;

public class CommitStudentImportCommandHandler : ResponseHandler,
    IRequestHandler<CommitStudentImportCommand, Response<StudentImportCommitResult>>
{
    private const int BatchSize = 100;

    private enum RowAction
    {
        Create,
        Update,
        Skip,
        Fail
    }

    private sealed class RowPlan
    {
        public required StudentImportRow Row { get; init; }
        public RowAction Action { get; set; }
        public Student? Existing { get; set; }
        public Group? Group { get; set; }
        public string? Error { get; set; }
        public SubscriptionType SubscriptionType { get; set; } = SubscriptionType.Month;
        public decimal? CustomMonthlyPrice { get; set; }
        public Student? Created { get; set; }
        public string? AccountReason { get; set; }
    }

    private readonly IRepositoryManager _repositoryManager;
    private readonly IUserScopeService _scopeService;
    private readonly IImportSessionStore _sessionStore;
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly IStudentCreationService _studentCreationService;
    private readonly IStudentAccountService _studentAccountService;
    private readonly IParentAccountService _parentAccountService;
    private readonly AppDbContext _dbContext;
    private readonly TimeProvider _timeProvider;

    public CommitStudentImportCommandHandler(
        IRepositoryManager repositoryManager,
        IUserScopeService scopeService,
        IImportSessionStore sessionStore,
        IHttpContextAccessor httpContextAccessor,
        IStudentCreationService studentCreationService,
        IStudentAccountService studentAccountService,
        IParentAccountService parentAccountService,
        AppDbContext dbContext,
        TimeProvider timeProvider,
        IStringLocalizer<SharedResources> localizer) : base(localizer)
    {
        _repositoryManager = repositoryManager;
        _scopeService = scopeService;
        _sessionStore = sessionStore;
        _httpContextAccessor = httpContextAccessor;
        _studentCreationService = studentCreationService;
        _studentAccountService = studentAccountService;
        _parentAccountService = parentAccountService;
        _dbContext = dbContext;
        _timeProvider = timeProvider;
    }

    public async Task<Response<StudentImportCommitResult>> Handle(
        CommitStudentImportCommand request,
        CancellationToken cancellationToken)
    {
        var (userId, centerId) = ResolveActor();

        if (string.IsNullOrWhiteSpace(request.SessionId))
            return BadRequest<StudentImportCommitResult>("جلسة الاستيراد مطلوبة");

        var claim = _sessionStore.TryClaim(
            request.SessionId, userId, centerId, out var session, out var cachedResult);

        switch (claim)
        {
            case ImportSessionClaim.NotFound:
                return BadRequest<StudentImportCommitResult>(
                    "جلسة الاستيراد غير موجودة أو منتهية. أعد رفع الملف.");

            case ImportSessionClaim.InProgress:
                return BadRequest<StudentImportCommitResult>(
                    "جارٍ تنفيذ استيراد هذه الجلسة بالفعل. انتظر انتهاء العملية.");

            case ImportSessionClaim.AlreadyCompleted:
                if (cachedResult is not null)
                {
                    cachedResult.AlreadyCompleted = true;
                    return Success(cachedResult, "تم تنفيذ هذا الاستيراد مسبقًا");
                }

                return BadRequest<StudentImportCommitResult>(
                    "جلسة الاستيراد منتهية. أعد رفع الملف.");
        }

        if (session is null)
            return BadRequest<StudentImportCommitResult>("جلسة الاستيراد غير موجودة");

        var releaseOnFailure = true;

        try
        {
            var scope = await _scopeService.ResolveAsync(cancellationToken);

            var center = await _repositoryManager.CenterRepository.GetByIdAsync(centerId);
            if (center is null)
                return BadRequest<StudentImportCommitResult>("المركز غير موجود");

            var subscription = CenterSubscriptionEvaluator.Evaluate(
                center, _timeProvider.GetUtcNow().UtcDateTime);

            if (!subscription.AllowsAccess)
            {
                return BadRequest<StudentImportCommitResult>(
                    "لا يمكن الاستيراد: اشتراك المركز منتهي أو موقوف. جدّد الاشتراك أولًا.");
            }

            var duplicateMode = string.Equals(
                request.DuplicateMode, "update", StringComparison.OrdinalIgnoreCase)
                ? "update" : "skip";

            var result = new StudentImportCommitResult();

            var groups = await LoadGroupsAsync(scope, centerId, cancellationToken);
            var groupsByName = groups.ToDictionary(
                g => g.Name.Trim(), g => g, StringComparer.OrdinalIgnoreCase);

            // Missing groups are prepared in memory first so the admission check
            // below runs before any database write (a future student cap must be
            // able to reject the whole file without creating any group).
            var pendingGroups = request.CreateMissingGroups && scope.CenterWide
                ? PrepareMissingGroups(session, groupsByName, centerId)
                : new List<Group>();

            var existingStudents = await LoadExistingStudentsAsync(
                centerId, cancellationToken);
            var existingByPhone = BuildPhoneIndex(existingStudents);

            // A phone that belongs to a non-student account (teacher, assistant,
            // parent, owner, student login) is reserved and can never be imported
            // or updated as a student.
            var reservedPhones = await LoadUserPhoneSetAsync(centerId, cancellationToken);

            var plans = PlanRows(
                session, groupsByName, existingByPhone, reservedPhones,
                scope, duplicateMode, result);

            // Count only rows that would actually create a student; skipped,
            // updated and failed rows never consume the (future) cap.
            var newCount = plans.Count(p => p.Action == RowAction.Create);
            var admission = await _studentCreationService.EnsureCanAddStudents(
                centerId, newCount, cancellationToken);
            if (!admission.Allowed)
            {
                return BadRequest<StudentImportCommitResult>(
                    admission.Reason ?? "لا يمكن إضافة المزيد من الطلاب لهذا المركز");
            }

            if (pendingGroups.Count > 0)
            {
                await PersistMissingGroupsAsync(
                    pendingGroups, result, cancellationToken);
            }

            await ProcessBatchesAsync(
                plans, request, centerId, result, cancellationToken);

            result.AlreadyCompleted = false;
            _sessionStore.Complete(request.SessionId, userId, centerId, result);
            releaseOnFailure = false;

            var message = result.Failed == 0
                ? $"تم استيراد {result.Created} طالب جديد" +
                  (result.Updated > 0 ? $" وتحديث {result.Updated}" : "") +
                  (result.Skipped > 0 ? $" وتخطي {result.Skipped}" : "")
                : $"تم إنشاء {result.Created} وتحديث {result.Updated} وتخطي {result.Skipped} وفشل {result.Failed} صف";

            return Success(result, message);
        }
        catch (Exception ex)
        {
            return BadRequest<StudentImportCommitResult>(
                "فشل الاستيراد: " + (ex.InnerException?.Message ?? ex.Message));
        }
        finally
        {
            if (releaseOnFailure)
                _sessionStore.ReleaseClaim(request.SessionId, userId, centerId);
        }
    }

    private (string userId, Guid centerId) ResolveActor()
    {
        var user = _httpContextAccessor.HttpContext?.User;

        var userId = user?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
            ?? user?.FindFirst("uid")?.Value
            ?? "unknown";

        var centerClaim = user?.FindFirst("CenterId")?.Value;
        Guid.TryParse(centerClaim, out var centerId);

        return (userId, centerId);
    }

    private async Task<List<Group>> LoadGroupsAsync(
        UserScope scope, Guid centerId, CancellationToken cancellationToken)
    {
        var query = _repositoryManager.GroupRepository.GetTableTracking();

        if (centerId != Guid.Empty)
            query = query.Where(g => g.CenterId == centerId);

        if (!scope.CenterWide)
            query = query.Where(g => scope.GroupIds.Contains(g.Id));

        return await query.ToListAsync(cancellationToken);
    }

    private static List<Group> PrepareMissingGroups(
        StudentImportSession session,
        Dictionary<string, Group> groupsByName,
        Guid centerId)
    {
        var missing = session.Rows
            .Where(r => !string.IsNullOrWhiteSpace(r.GroupName))
            .Select(r => r.GroupName!.Trim())
            .Where(name => !groupsByName.ContainsKey(name))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        var created = new List<Group>(missing.Count);
        foreach (var name in missing)
        {
            var group = new Group
            {
                Name = name,
                CenterId = centerId,
                MonthlyPrice = 0,
                SessionsPerMonth = 8
            };

            groupsByName[name] = group;
            created.Add(group);
        }

        return created;
    }

    private async Task PersistMissingGroupsAsync(
        List<Group> pendingGroups,
        StudentImportCommitResult result,
        CancellationToken cancellationToken)
    {
        if (pendingGroups.Count == 0)
            return;

        await using var transaction = await _repositoryManager.BeginTransactionAsync();

        try
        {
            foreach (var group in pendingGroups)
            {
                await _repositoryManager.GroupRepository.AddAsync(group);
                result.CreatedGroups.Add(group.Name);
            }

            await _repositoryManager.SaveChangesAsync();
            await transaction.CommitAsync();
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    private async Task<List<Student>> LoadExistingStudentsAsync(
        Guid centerId, CancellationToken cancellationToken)
    {
        IQueryable<Student> query = _repositoryManager.StudentRepository
            .GetTableTracking()
            .Include(s => s.StudentGroups);

        if (centerId != Guid.Empty)
            query = query.Where(s => s.CenterId == centerId);

        // Phone uniqueness is checked at the center level on commit, regardless
        // of the user's group scope. The scope only limits which groups to target.
        return await query.ToListAsync(cancellationToken);
    }

    private static bool IsInScope(Student student, UserScope scope)
    {
        if (scope.CenterWide)
            return true;

        return student.StudentGroups.Any(
            sg => scope.GroupIds.Contains(sg.GroupId) && sg.IsActive && sg.LeftAt == null);
    }

    private static Dictionary<string, Student> BuildPhoneIndex(IEnumerable<Student> students)
    {
        var index = new Dictionary<string, Student>(StringComparer.Ordinal);

        foreach (var student in students)
        {
            if (!PhoneNormalizer.TryNormalize(student.PhoneNumber, out var phone, out _))
                continue;

            index.TryAdd(phone, student);
        }

        return index;
    }

    private async Task<HashSet<string>> LoadUserPhoneSetAsync(
        Guid centerId,
        CancellationToken cancellationToken)
    {
        IQueryable<CenterManagement.Data.Entities.Identity.User> query =
            _dbContext.Users.AsNoTracking();

        if (centerId != Guid.Empty)
            query = query.Where(u => u.CenterId == centerId);

        var phones = await query
            .Select(u => u.PhoneNumber)
            .ToListAsync(cancellationToken);

        var set = new HashSet<string>(StringComparer.Ordinal);
        foreach (var raw in phones)
        {
            if (string.IsNullOrWhiteSpace(raw))
                continue;

            if (PhoneNormalizer.TryNormalize(raw, out var normalized, out _))
                set.Add(normalized);
            else
                set.Add(raw.Trim());
        }

        return set;
    }

    private static List<RowPlan> PlanRows(
        StudentImportSession session,
        Dictionary<string, Group> groupsByName,
        Dictionary<string, Student> existingByPhone,
        HashSet<string> reservedUserPhones,
        UserScope scope,
        string duplicateMode,
        StudentImportCommitResult result)
    {
        var plans = new List<RowPlan>(session.Rows.Count);
        var seenPhones = new HashSet<string>(StringComparer.Ordinal);

        foreach (var row in session.Rows)
        {
            var plan = new RowPlan { Row = row };

            if (!PhoneNormalizer.TryNormalize(row.Phone, out var phone, out var phoneError))
            {
                plan.Action = RowAction.Fail;
                plan.Error = phoneError ?? "رقم الهاتف غير صالح";
                plans.Add(plan);
                continue;
            }

            if (row.PhoneNormalized is not null && row.PhoneNormalized != phone)
            {
                plan.Action = RowAction.Fail;
                plan.Error = "تغيّر رقم الهاتف بعد المعاينة. أعد رفع الملف.";
                plans.Add(plan);
                continue;
            }

            if (string.IsNullOrWhiteSpace(row.FullName))
            {
                plan.Action = RowAction.Fail;
                plan.Error = "الاسم الكامل مطلوب";
                plans.Add(plan);
                continue;
            }

            if (!seenPhones.Add(phone))
            {
                plan.Action = RowAction.Fail;
                plan.Error = "رقم الهاتف مكرر داخل الملف";
                plans.Add(plan);
                continue;
            }

            if (string.IsNullOrWhiteSpace(row.GroupName) ||
                !groupsByName.TryGetValue(row.GroupName.Trim(), out var group))
            {
                plan.Action = RowAction.Fail;
                plan.Error = "المجموعة غير موجودة أو خارج نطاقك";
                plans.Add(plan);
                continue;
            }

            // A teacher/assistant may only create a student in a group they can
            // access. The group lookup above is already scoped, so out-of-scope
            // groups never resolve and are rejected here.
            if (!scope.CenterWide)
            {
                if (!scope.GroupIds.Contains(group.Id))
                {
                    plan.Action = RowAction.Fail;
                    plan.Error = "المجموعة غير موجودة أو خارج نطاقك";
                    plans.Add(plan);
                    continue;
                }
            }

            if (!PhoneNormalizer.TryNormalize(row.PhoneParent, out var parentPhone, out var parentError))
            {
                plan.Action = RowAction.Fail;
                plan.Error = parentError ?? "رقم هاتف ولي الأمر غير صالح";
                plans.Add(plan);
                continue;
            }

            row.PhoneNormalized = phone;
            row.PhoneParentNormalized = parentPhone;
            plan.Group = group;
            plan.SubscriptionType = ParseSubscriptionType(row.SubscriptionType);
            plan.CustomMonthlyPrice = ParsePrice(row.CustomMonthlyPrice);

            if (existingByPhone.TryGetValue(phone, out var existing))
            {
                // The phone is unique across the whole center, but a duplicate that
                // lives outside the caller's scope must never be updated (or
                // identified) by this import.
                if (!IsInScope(existing, scope))
                {
                    plan.Action = RowAction.Fail;
                    plan.Error = "رقم الهاتف مكرر";
                }
                else if (duplicateMode == "update")
                {
                    plan.Action = RowAction.Update;
                    plan.Existing = existing;
                }
                else
                {
                    plan.Action = RowAction.Skip;
                }
            }
            else if (reservedUserPhones.Contains(phone))
            {
                // A non-student account (teacher, assistant, parent, owner) owns
                // this phone; only this row fails, the rest of the file proceeds.
                plan.Action = RowAction.Fail;
                plan.Error = "رقم الهاتف مرتبط بدور آخر";
            }
            else
            {
                plan.Action = RowAction.Create;
            }

            plans.Add(plan);
        }

        return plans;
    }

    private async Task ProcessBatchesAsync(
        List<RowPlan> plans,
        CommitStudentImportCommand request,
        Guid centerId,
        StudentImportCommitResult result,
        CancellationToken cancellationToken)
    {
        foreach (var plan in plans.Where(p => p.Action == RowAction.Fail))
        {
            AddError(result, plan.Row, plan.Error ?? "صف غير صالح");
        }

        foreach (var plan in plans.Where(p => p.Action == RowAction.Skip))
            result.Skipped++;

        var work = plans
            .Where(p => p.Action is RowAction.Create or RowAction.Update)
            .ToList();

        for (var offset = 0; offset < work.Count; offset += BatchSize)
        {
            var batch = work.Skip(offset).Take(BatchSize).ToList();
            await ProcessBatchAsync(
                batch, request, centerId, result, cancellationToken);
        }
    }

    private async Task ProcessBatchAsync(
        List<RowPlan> batch,
        CommitStudentImportCommand request,
        Guid centerId,
        StudentImportCommitResult result,
        CancellationToken cancellationToken)
    {
        await using var transaction = await _repositoryManager.BeginTransactionAsync();

        try
        {
            foreach (var plan in batch)
            {
                if (plan.Action == RowAction.Create)
                {
                    plan.Created = await _studentCreationService.CreateStudentAsync(
                        new CreateStudentInput
                        {
                            FullName = plan.Row.FullName!.Trim(),
                            PhoneNumber = plan.Row.PhoneNormalized!,
                            ParentPhoneNumber = plan.Row.PhoneParentNormalized!,
                            GroupId = plan.Group!.Id,
                            SubscriptionType = plan.SubscriptionType,
                            CustomMonthlyPrice = plan.CustomMonthlyPrice,
                            CenterId = centerId
                        },
                        cancellationToken);
                }
                else if (plan.Action == RowAction.Update && plan.Existing is not null)
                {
                    // Only name/contact data may change on import update. Group
                    // membership, status, payment state, join dates, QR, accounts,
                    // subscription and financial history must remain untouched.
                    var student = plan.Existing;
                    student.FullName = plan.Row.FullName!.Trim();
                    student.PhoneNumber = plan.Row.PhoneNormalized!;
                    student.ParentPhoneNumber = plan.Row.PhoneParentNormalized!;

                    var hasMembership = student.StudentGroups.Any(
                        sg => sg.GroupId == plan.Group!.Id && sg.IsActive && sg.LeftAt == null);

                    if (!hasMembership)
                    {
                        student.StudentGroups.Add(new StudentGroup
                        {
                            StudentId = student.Id,
                            GroupId = plan.Group!.Id,
                            CenterId = centerId,
                            JoinDate = DateTime.UtcNow,
                            IsActive = true,
                            LeftAt = null
                        });
                    }

                    await _repositoryManager.StudentRepository.UpdateAsync(student);
                    await _repositoryManager.SaveChangesAsync();
                }
            }

            await transaction.CommitAsync();
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();

            var reason = "فشل حفظ الصف: " + (ex.InnerException?.Message ?? ex.Message);
            foreach (var plan in batch)
            {
                AddError(result, plan.Row, reason);
                plan.Action = RowAction.Fail;
            }

            return;
        }

        foreach (var plan in batch)
        {
            if (plan.Action == RowAction.Create && plan.Created is not null)
            {
                result.Created++;
                result.CreatedStudents.Add(new
                {
                    plan.Created.Id,
                    plan.Created.FullName,
                    Group = plan.Group?.Name,
                    Action = "created"
                });

                await CreateAccountsAsync(
                    plan, request, result, cancellationToken);
            }
            else if (plan.Action == RowAction.Update && plan.Existing is not null)
            {
                result.Updated++;
                result.CreatedStudents.Add(new
                {
                    plan.Existing.Id,
                    plan.Existing.FullName,
                    Group = plan.Group?.Name,
                    Action = "updated"
                });

                await CreateAccountsAsync(
                    plan, request, result, cancellationToken);
            }
        }
    }

    private async Task CreateAccountsAsync(
        RowPlan plan,
        CommitStudentImportCommand request,
        StudentImportCommitResult result,
        CancellationToken cancellationToken)
    {
        var student = plan.Created ?? plan.Existing;
        if (student is null)
            return;

        if (request.CreateStudentAccounts)
        {
            var (credential, reason) = await _studentAccountService.CreateAccountAsync(
                student, cancellationToken);

            if (credential is not null || reason is not null)
            {
                result.StudentAccounts ??= new List<object>();
                ((List<object>)result.StudentAccounts).Add(new
                {
                    student.Id,
                    student.FullName,
                    credential?.Username,
                    credential?.TemporaryPassword,
                    Reason = reason
                });
            }

            if (credential is null && reason is not null && reason != "الحساب موجود بالفعل")
                AddWarning(result, plan.Row, $"تم حفظ الطالب لكن تعذر إنشاء حسابه: {reason}");
        }

        if (request.CreateParentAccounts)
        {
            var outcome = await _parentAccountService.EnsureAccountAsync(
                student, cancellationToken);

            result.ParentAccounts ??= new List<object>();
            ((List<object>)result.ParentAccounts).Add(new
            {
                outcome.StudentId,
                outcome.StudentName,
                outcome.ParentPhone,
                Status = outcome.Status.ToString(),
                outcome.TemporaryPassword,
                outcome.PasswordChanged,
                outcome.Reason
            });
        }
    }

    private static void AddError(
        StudentImportCommitResult result, StudentImportRow row, string reason)
    {
        result.Failed++;
        AddWarning(result, row, reason);
    }

    private static void AddWarning(
        StudentImportCommitResult result, StudentImportRow row, string reason)
    {
        result.Errors.Add(new StudentImportError
        {
            RowNumber = row.RowNumber,
            FullName = row.FullName,
            Reason = reason
        });
    }

    private static SubscriptionType ParseSubscriptionType(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return SubscriptionType.Month;

        var normalized = value.Trim();

        return normalized.Contains("حصة", StringComparison.Ordinal) ||
               normalized.Contains("session", StringComparison.OrdinalIgnoreCase)
            ? SubscriptionType.Session
            : SubscriptionType.Month;
    }

    private static decimal? ParsePrice(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return null;

        return decimal.TryParse(
            value.Trim(),
            System.Globalization.NumberStyles.Number,
            System.Globalization.CultureInfo.InvariantCulture,
            out var price) && price >= 0
            ? price
            : null;
    }
}

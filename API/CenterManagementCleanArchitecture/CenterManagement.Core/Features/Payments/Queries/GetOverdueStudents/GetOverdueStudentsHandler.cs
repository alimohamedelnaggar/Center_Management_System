using CenterManagement.Core.Features.Payments.Queries.Models;
using CenterManagement.Core.Features.Payments.Queries.Results;
using CenterManagement.Core.Features.Payments.Shared;
using CenterManagement.Infrustructure.InfrastructureBases.Bases;
using Microsoft.EntityFrameworkCore;

namespace CenterManagement.Core.Features.Payments.Queries.Handlers;

/// <summary>
/// Lists the students of a center who still owe money for a billing month
/// (nothing paid, or only a part). The amount due is derived by the shared
/// <see cref="IMonthlyDueService"/>, the same logic the center-wide reports
/// use, so the numbers stay consistent with the rest of the system.
/// </summary>
public sealed class GetOverdueStudentsQueryHandler
    : ResponseHandler,
      IRequestHandler<
          GetOverdueStudentsQuery,
          PaginatedResult<GetOverdueStudentsResponse>>
{
    private const int DefaultPageSize = 10;

    private readonly IUserScopeService _scopeService;
    private readonly IMonthlyDueService _dueService;
    private readonly AppDbContext _context;

    public GetOverdueStudentsQueryHandler(
        IUserScopeService scopeService,
        IMonthlyDueService dueService,
        AppDbContext context,
        IStringLocalizer<SharedResources> stringLocalizer)
        : base(stringLocalizer)
    {
        _scopeService = scopeService;
        _dueService = dueService;
        _context = context;
    }

    public async Task<PaginatedResult<GetOverdueStudentsResponse>> Handle(
        GetOverdueStudentsQuery request,
        CancellationToken cancellationToken)
    {
        var scope = await _scopeService.ResolveAsync(cancellationToken);

        var pageNumber = request.PageNumber < 1 ? 1 : request.PageNumber;
        var pageSize = request.PageSize < 1 ? DefaultPageSize : request.PageSize;

        var effectiveBillingPeriod = request.BillingPeriod.HasValue
            ? new DateOnly(
                request.BillingPeriod.Value.Year,
                request.BillingPeriod.Value.Month,
                1)
            : new DateOnly(DateTime.Today.Year, DateTime.Today.Month, 1);

        // =========================================================
        // Which groups is the caller allowed to see?
        //   - Teacher / linked assistant : only his own groups.
        //   - Center admin / owner       : the whole center.
        // A teacher filter narrows this further.
        // =========================================================

        HashSet<Guid>? allowedGroups = null;

        if (request.TeacherId.HasValue)
        {
            var teacherGroupIds = await _context.TeacherGroups
                .Where(tg => tg.TeacherId == request.TeacherId.Value)
                .Select(tg => tg.GroupId)
                .ToListAsync(cancellationToken);

            allowedGroups = teacherGroupIds.ToHashSet();
        }

        if (scope.IsRestricted)
        {
            allowedGroups = allowedGroups is null
                ? scope.GroupIds.ToHashSet()
                : allowedGroups.Intersect(scope.GroupIds).ToHashSet();
        }

        if (request.GroupId.HasValue)
        {
            var groupId = request.GroupId.Value;

            if (allowedGroups is not null && !allowedGroups.Contains(groupId))
            {
                return PaginatedResult<GetOverdueStudentsResponse>.Success(
                    new List<GetOverdueStudentsResponse>(),
                    0,
                    pageNumber,
                    pageSize);
            }

            allowedGroups = new HashSet<Guid> { groupId };
        }

        // =========================================================
        // Billing is delegated to the shared service (the same one the
        // center-wide reports use), then narrowed to the overdue rows.
        // =========================================================

        var dueRows = await _dueService.CalculateDueAsync(
            scope,
            allowedGroups,
            effectiveBillingPeriod,
            request.Search,
            cancellationToken);

        var overdue = dueRows
            .Where(x => x.IsOverdue)
            .Select(x => new GetOverdueStudentsResponse
            {
                StudentId = x.StudentId,
                StudentName = x.StudentName,
                GroupId = x.GroupId,
                GroupName = x.GroupName,
                TeacherName = string.Empty,
                ParentPhoneNumber = x.ParentPhoneNumber,
                StudentPhoneNumber = x.StudentPhoneNumber,
                SubscriptionType = x.SubscriptionType,
                BillingPeriod = x.BillingPeriod,
                TotalAmount = x.TotalAmount,
                PaidAmount = x.PaidAmount,
                RemainingAmount = x.RemainingAmount,
                LastPaymentDate = x.LastPaymentDate,
                Status = x.PaidAmount > 0
                    ? PaymentStatus.PartialPaid
                    : PaymentStatus.NotPaid
            })
            .ToList();

        // =========================================================
        // Teacher names (loaded separately: the finance query does not
        // include Group -> TeacherGroups).
        // =========================================================

        var groupIds = overdue
            .Select(x => x.GroupId)
            .Distinct()
            .ToList();

        if (groupIds.Count > 0)
        {
            var teacherRows = await _context.TeacherGroups
                .Where(tg => groupIds.Contains(tg.GroupId))
                .Select(tg => new { tg.GroupId, tg.Teacher.FullName })
                .ToListAsync(cancellationToken);

            var nameByGroup = teacherRows
                .GroupBy(x => x.GroupId)
                .ToDictionary(
                    g => g.Key,
                    g => g.Select(x => x.FullName)
                          .FirstOrDefault(n => !string.IsNullOrWhiteSpace(n))
                          ?? string.Empty);

            foreach (var item in overdue)
            {
                if (nameByGroup.TryGetValue(item.GroupId, out var name))
                    item.TeacherName = name;
            }
        }

        // =========================================================
        // Totals (whole filtered set, not just the page)
        // =========================================================

        var totals = new OverdueStudentsTotals
        {
            TotalStudents = overdue.Count,
            TotalDue = overdue.Sum(x => x.TotalAmount),
            TotalPaid = overdue.Sum(x => x.PaidAmount),
            TotalRemaining = overdue.Sum(x => x.RemainingAmount)
        };

        // =========================================================
        // Order + paginate
        // =========================================================

        var pageItems = overdue
            .OrderByDescending(x => x.RemainingAmount)
            .ThenBy(x => x.StudentName)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .ToList();

        var result = PaginatedResult<GetOverdueStudentsResponse>.Success(
            pageItems,
            totals.TotalStudents,
            pageNumber,
            pageSize);

        result.Meta = totals;

        return result;
    }
}

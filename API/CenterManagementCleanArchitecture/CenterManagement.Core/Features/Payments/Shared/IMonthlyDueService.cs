using CenterManagement.Core.Bases;
using CenterManagement.Data.Entities;
using CenterManagement.Data.Entities.Abstractions;
using CenterManagement.Data.Enums;
using CenterManagement.Infrustructure.Data;
using CenterManagement.Infrustructure.InfrastructureBases.Bases;
using Microsoft.EntityFrameworkCore;

namespace CenterManagement.Core.Features.Payments.Shared;

/// <summary>
/// The amount a single (student, group) pair owes for one billing month,
/// derived from the very same <see cref="MonthlyBillingCalculator"/> used when
/// a payment is recorded. This is the single source of truth shared by the
/// overdue page and the center-wide reports so the two can never diverge.
/// </summary>
public sealed class StudentGroupDue
{
    public Guid StudentId { get; init; }

    public string StudentName { get; init; } = default!;

    public Guid GroupId { get; init; }

    public string GroupName { get; init; } = default!;

    public string ParentPhoneNumber { get; init; } = string.Empty;

    public string StudentPhoneNumber { get; init; } = string.Empty;

    public SubscriptionType SubscriptionType { get; init; }

    public DateOnly BillingPeriod { get; init; }

    public decimal TotalAmount { get; init; }

    public decimal PaidAmount { get; init; }

    public decimal RemainingAmount { get; init; }

    public DateTime? LastPaymentDate { get; init; }

    /// <summary>True when the (student, group) pair still owes for the month.</summary>
    public bool IsOverdue => RemainingAmount > 0;
}

/// <summary>
/// Computes the per-(student, group) monthly dues for a billing month and a
/// user scope. Returns EVERY applicable pair (fully paid ones included) so
/// callers can both list the overdue subset and aggregate expected/collected/
/// outstanding totals.
/// </summary>
public interface IMonthlyDueService
{
    /// <param name="scope">The caller's data scope (center-wide or own groups).</param>
    /// <param name="allowedGroupIds">
    /// When non-null the result is limited to these groups (an empty set yields
    /// no rows). Used for the teacher/group filters.
    /// </param>
    /// <param name="billingPeriod">The month being billed (normalized to the 1st).</param>
    /// <param name="search">Optional name/phone search.</param>
    Task<List<StudentGroupDue>> CalculateDueAsync(
        UserScope scope,
        IReadOnlyCollection<Guid>? allowedGroupIds,
        DateOnly billingPeriod,
        string? search,
        CancellationToken cancellationToken = default);
}

public sealed class MonthlyDueService : IMonthlyDueService
{
    // The center's billing system started recording from August 2026.
    private static readonly DateOnly SystemStartPeriod = new(2026, 8, 1);

    private readonly IRepositoryManager _repository;
    private readonly AppDbContext _context;

    public MonthlyDueService(IRepositoryManager repository, AppDbContext context)
    {
        _repository = repository;
        _context = context;
    }

    public async Task<List<StudentGroupDue>> CalculateDueAsync(
        UserScope scope,
        IReadOnlyCollection<Guid>? allowedGroupIds,
        DateOnly billingPeriod,
        string? search,
        CancellationToken cancellationToken = default)
    {
        billingPeriod = new DateOnly(billingPeriod.Year, billingPeriod.Month, 1);

        var result = new List<StudentGroupDue>();

        // An explicitly empty filter means "no groups are allowed".
        if (allowedGroupIds is not null && allowedGroupIds.Count == 0)
            return result;

        // =========================================================
        // Base query: active monthly students in an active group.
        // =========================================================

        var query = _repository.StudentRepository
            .GetStudentsFinanceQuery()
            .ScopeToUser(scope)
            .Where(s => s.SubscriptionType == SubscriptionType.Month)
            .Where(s => s.StudentGroups.Any(sg =>
                sg.IsActive && sg.LeftAt == null));

        if (allowedGroupIds is not null)
        {
            query = query.Where(s => s.StudentGroups.Any(sg =>
                sg.IsActive &&
                sg.LeftAt == null &&
                allowedGroupIds.Contains(sg.GroupId)));
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim();

            query = query.Where(s =>
                s.FullName.Contains(term) ||
                s.ParentPhoneNumber.Contains(term) ||
                s.PhoneNumber.Contains(term));
        }

        var students = await query.ToListAsync(cancellationToken);

        // =========================================================
        // In-memory billing (depends on the join month + calculator).
        // The center's student count is small, so this is acceptable.
        // =========================================================

        // One row per (student, group): a student enrolled in two groups is
        // evaluated separately for each group, and the payment/StudentAmount is
        // matched by the payment's own GroupId. This avoids showing a single
        // row with the first group's price.
        foreach (var student in students)
        {
            var activeGroups = student.StudentGroups
                .Where(sg => sg.IsActive && sg.LeftAt == null && sg.Group is not null);

            if (allowedGroupIds is not null)
            {
                activeGroups = activeGroups.Where(sg =>
                    allowedGroupIds.Contains(sg.GroupId));
            }

            foreach (var studentGroup in activeGroups)
            {
                var group = studentGroup.Group!;

                var joinPeriod = new DateOnly(
                    studentGroup.JoinDate.Year,
                    studentGroup.JoinDate.Month,
                    1);

                // Nothing is due before the student joined or before the center
                // started billing (August 2026).
                var firstApplicablePeriod =
                    joinPeriod > SystemStartPeriod ? joinPeriod : SystemStartPeriod;

                if (billingPeriod < firstApplicablePeriod)
                    continue;

                // Payments are matched for THIS group only (Payment.GroupId).
                var relevantPayments = student.Payments
                    .Where(p =>
                        p.GroupId == studentGroup.GroupId &&
                        p.BillingPeriod == billingPeriod)
                    .ToList();

                var lastPayment = relevantPayments
                    .OrderByDescending(p => p.PaymentDate)
                    .FirstOrDefault();

                // PaidAmount is cumulative for the month (previous + this
                // payment), so the latest StudentAmount already carries the
                // month total for this group.
                var lastAmount = lastPayment?
                    .StudentAmounts
                    .OrderByDescending(a => a.CreatedAt)
                    .FirstOrDefault();

                var billing = MonthlyBillingCalculator.Calculate(
                    group.MonthlyPrice,
                    student.CustomMonthlyPrice,
                    group.SessionsPerMonth,
                    lastAmount?.BilledSessions);

                var totalAmount = billing.TotalAmount;
                var paidAmount = lastAmount?.PaidAmount ?? 0;
                var remainingAmount = Math.Max(0, totalAmount - paidAmount);

                result.Add(new StudentGroupDue
                {
                    StudentId = student.Id,
                    StudentName = student.FullName,
                    GroupId = studentGroup.GroupId,
                    GroupName = group.Name,
                    ParentPhoneNumber = student.ParentPhoneNumber ?? string.Empty,
                    StudentPhoneNumber = student.PhoneNumber ?? string.Empty,
                    SubscriptionType = student.SubscriptionType,
                    BillingPeriod = billingPeriod,
                    TotalAmount = totalAmount,
                    PaidAmount = paidAmount,
                    RemainingAmount = remainingAmount,
                    LastPaymentDate = lastPayment?.PaymentDate
                });
            }
        }

        return result;
    }
}

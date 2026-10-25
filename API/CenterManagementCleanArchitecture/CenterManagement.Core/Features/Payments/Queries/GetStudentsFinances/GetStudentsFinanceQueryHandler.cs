using CenterManagement.Core.Features.Payments.Queries.Models;
using CenterManagement.Core.Features.Payments.Queries.Results;
using CenterManagement.Data.Entities;
using CenterManagement.Data.Enums;
using CenterManagement.Infrustructure.InfrastructureBases.Bases;
using Microsoft.EntityFrameworkCore;

public sealed class GetStudentsFinanceQueryHandler
    : ResponseHandler,
      IRequestHandler<GetStudentsFinanceQuery,
          PaginatedResult<GetStudentsFinanceResponse>>
{
    private readonly IRepositoryManager repositoryManager;
    private readonly IUserScopeService _scopeService;

    public GetStudentsFinanceQueryHandler(
        IRepositoryManager repositoryManager,
        IUserScopeService scopeService,
        IStringLocalizer<SharedResources> stringLocalizer)
        : base(stringLocalizer)
    {
        this.repositoryManager = repositoryManager;
        _scopeService = scopeService;
    }

    public async Task<PaginatedResult<GetStudentsFinanceResponse>> Handle(
        GetStudentsFinanceQuery request,
        CancellationToken cancellationToken)
    {
        var scope = await _scopeService.ResolveAsync(cancellationToken);

        // =========================================================
        // Base Query
        // =========================================================

        var query = repositoryManager.StudentRepository
            .GetStudentsFinanceQuery()
            .ScopeToUser(scope);

        // =========================================================
        // Effective Billing Period
        // =========================================================

        var effectiveBillingPeriod = request.BillingPeriod.HasValue
            ? new DateOnly(
                request.BillingPeriod.Value.Year,
                request.BillingPeriod.Value.Month,
                1)
            : new DateOnly(
                DateTime.Today.Year,
                DateTime.Today.Month,
                1);

        // =========================================================
        // Search
        // =========================================================

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var search = request.Search.Trim();

            query = query.Where(x =>
                x.FullName.Contains(search));
        }

        // =========================================================
        // Group Filter
        // =========================================================

        if (request.GroupId.HasValue)
        {
            var groupId = request.GroupId.Value;

            /*
             * IMPORTANT:
             *
             * Get only ACTIVE students
             * who are CURRENTLY ACTIVE in the selected group.
             *
             * Student.IsActive is already handled by
             * GetStudentsFinanceQuery().
             */

            query = query.Where(x =>
                x.StudentGroups.Any(sg =>
                    sg.GroupId == groupId &&
                    sg.IsActive &&
                    sg.LeftAt == null));
        }

        // =========================================================
        // Subscription Type Filter
        // =========================================================

        if (request.SubscriptionType.HasValue)
        {
            query = query.Where(x =>
                x.SubscriptionType == request.SubscriptionType.Value);
        }

        // =========================================================
        // Payment Status Filter
        // =========================================================

        if (request.PaymentStatus.HasValue)
        {
            var currentBillingPeriod = new DateOnly(
                DateTime.Today.Year,
                DateTime.Today.Month,
                1);

            switch (request.PaymentStatus.Value)
            {
                // -------------------------------------------------
                // Fully Paid
                // -------------------------------------------------

                case (int)PaymentStatus.FullyPaid:

                    query = query.Where(student =>
                        student.Payments.Any(payment =>
                            payment.BillingPeriod == effectiveBillingPeriod &&
                            payment.StudentAmounts.Any(amount =>
                                amount.Status == PaymentStatus.FullyPaid)));

                    break;

                // -------------------------------------------------
                // Partial Paid
                // -------------------------------------------------

                case (int)PaymentStatus.PartialPaid:

                    query = query.Where(student =>
                        student.Payments.Any(payment =>
                            payment.BillingPeriod == effectiveBillingPeriod &&
                            payment.StudentAmounts.Any(amount =>
                                amount.Status == PaymentStatus.PartialPaid)));

                    break;

                // -------------------------------------------------
                // Not Paid
                // -------------------------------------------------

                case (int)PaymentStatus.NotPaid:

                    query = query.Where(student =>
                        !student.Payments.Any(payment =>
                            payment.BillingPeriod == currentBillingPeriod &&
                            payment.StudentAmounts.Any(amount =>
                                amount.Status == PaymentStatus.FullyPaid ||
                                amount.Status == PaymentStatus.PartialPaid)));

                    break;

                // -------------------------------------------------
                // UnPaid
                // -------------------------------------------------

                case (int)PaymentStatus.UnPaid:

                    query = query.Where(student =>
                        !student.Payments.Any(payment =>
                            payment.BillingPeriod == effectiveBillingPeriod &&
                            payment.StudentAmounts.Any(amount =>
                                amount.Status == PaymentStatus.FullyPaid ||
                                amount.Status == PaymentStatus.PartialPaid)));

                    break;
            }
        }

        // =========================================================
        // Total Count
        // =========================================================

        var totalCount = await query
            .CountAsync(cancellationToken);

        // =========================================================
        // Pagination
        // =========================================================

        var students = await query
            .OrderBy(x => x.FullName)
            .Skip((request.PageNumber - 1) * request.PageSize)
            .Take(request.PageSize)
            .ToListAsync(cancellationToken);

        // =========================================================
        // Mapping
        // =========================================================

        var response = students.Select(student =>
        {
            // -----------------------------------------------------
            // Current Active Student Group
            // -----------------------------------------------------

            var activeStudentGroup = request.GroupId.HasValue
                ? student.StudentGroups
                    .FirstOrDefault(sg =>
                        sg.GroupId == request.GroupId.Value &&
                        sg.IsActive &&
                        sg.LeftAt == null)
                : student.StudentGroups
                    .FirstOrDefault(sg =>
                        sg.IsActive &&
                        sg.LeftAt == null);

            // -----------------------------------------------------
            // Payments For Selected Billing Period
            // -----------------------------------------------------

            var relevantPayments = student.Payments
                .Where(payment =>
                    payment.BillingPeriod == effectiveBillingPeriod)
                .ToList();

            // -----------------------------------------------------
            // Join Date
            // -----------------------------------------------------
            //
            // StudentGroup.JoinDate = date when the student
            // joined this specific group.
            //
            // Do NOT use Student.CreatedAt here.
            // -----------------------------------------------------

            DateTime? joinDate = activeStudentGroup?.JoinDate;

            // -----------------------------------------------------
            // Did Student Join After Selected Billing Period?
            // -----------------------------------------------------
            //
            // Example:
            //
            // JoinDate       = 2026-09-05
            // BillingPeriod  = 2026-08-01
            //
            // Result:
            // joinedAfterBillingPeriod = true
            //
            // Therefore frontend shows:
            //
            // لم يكن مشتركًا
            // انضم في سبتمبر 2026
            // -----------------------------------------------------

            var joinedAfterBillingPeriod =
                joinDate.HasValue &&
                new DateOnly(
                    joinDate.Value.Year,
                    joinDate.Value.Month,
                    1) > effectiveBillingPeriod;

            // -----------------------------------------------------
            // Last Payment For Selected Month
            // -----------------------------------------------------

            var lastPayment = relevantPayments
                .OrderByDescending(x => x.PaymentDate)
                .FirstOrDefault();

            // -----------------------------------------------------
            // Last Amount
            // -----------------------------------------------------

            var lastAmount = lastPayment?
                .StudentAmounts
                .FirstOrDefault();

            // -----------------------------------------------------
            // Response
            // -----------------------------------------------------

            return new GetStudentsFinanceResponse
            {
                StudentId = student.Id,

                GroupId = activeStudentGroup?.GroupId
                          ?? Guid.Empty,

                StudentName = student.FullName,

                GroupName = activeStudentGroup?.Group?.Name
                            ?? string.Empty,

                SubscriptionType = student.SubscriptionType,

                LastPaymentAmount = lastAmount?.Amount,

                LastPaymentDate = lastPayment?.PaymentDate,

                BillingPeriod = lastPayment?.BillingPeriod,

                TotalAmount = lastAmount?.TotalAmount ?? 0,

                PaidAmount = lastAmount?.PaidAmount ?? 0,

                RemainingAmount = lastAmount?.RemainingAmount ?? 0,

                IsPaidAlways = student.IsPaid,

                // Student joined the selected group
                // AFTER the selected billing month.
                JoinedAfterBillingPeriod =
                    joinedAfterBillingPeriod,

                // Student's join date in the selected/current group.
                JoinDate = joinDate,

                IsPaid =
                    student.IsPaid ||
                    HasPaidCurrentMonth(
                        student,
                        effectiveBillingPeriod)
            };
        }).ToList();

        // =========================================================
        // Return
        // =========================================================

        return PaginatedResult<GetStudentsFinanceResponse>.Success(
            response,
            totalCount,
            request.PageNumber,
            request.PageSize);
    }

    // =============================================================
    // Check Monthly Payment
    // =============================================================

    private static bool HasPaidCurrentMonth(
        Student student,
        DateOnly billingPeriod)
    {
        if (student.SubscriptionType != SubscriptionType.Month)
            return false;

        return student.Payments.Any(x =>
            x.BillingPeriod == billingPeriod);
    }
}
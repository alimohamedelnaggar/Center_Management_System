using CenterManagement.Core.Features.Payments.Commands.Models;
using CenterManagement.Core.Features.Payments.Shared;
using CenterManagement.Data.Entities;
using CenterManagement.Infrustructure.Data;
using CenterManagement.Infrustructure.InfrastructureBases.Bases;
using Microsoft.EntityFrameworkCore;

namespace CenterManagement.Core.Features.Payments.Commands.Handlers;

public class AddPaymentHandler : ResponseHandler,
    IRequestHandler<AddPaymentCommand, Response<string>>
{
    private readonly IRepositoryManager _repository;
    private readonly IPaymentNotificationService _paymentNotificationService;
    private readonly IUserScopeService _scopeService;
    private readonly ITenantContext _tenantContext;
    private readonly AppDbContext _context;
    private readonly IReceiptNumberService _receiptNumberService;

    public AddPaymentHandler(
        IRepositoryManager repository,
        IStringLocalizer<SharedResources> stringLocalizer,
        IPaymentNotificationService paymentNotificationService,
        IUserScopeService scopeService,
        ITenantContext tenantContext,
        AppDbContext context,
        IReceiptNumberService receiptNumberService)
        : base(stringLocalizer)
    {
        _repository = repository;
        _paymentNotificationService = paymentNotificationService;
        _scopeService = scopeService;
        _tenantContext = tenantContext;
        _context = context;
        _receiptNumberService = receiptNumberService;
    }

    public async Task<Response<string>> Handle(
        AddPaymentCommand request,
        CancellationToken cancellationToken)
    {
        // ==============================
        // Scope: a teacher can only take payments for his own groups.
        // ==============================

        var scope = await _scopeService.ResolveAsync(cancellationToken);

        if (!scope.Allows(request.GroupId))
            return NotFound<string>(
                "المجموعة غير موجودة.");

        // ==============================
        // Validate Student
        // ==============================

        var student = await _repository.StudentRepository
            .GetByIdWithGroupAsync(request.StudentId);

        if (student is null)
            return NotFound<string>(
                "الطالب غير موجود.");

        // ==============================
        // Validate Group
        // ==============================

        var group = await _repository.GroupRepository
            .GetByIdAsync(request.GroupId);

        if (group is null)
            return NotFound<string>(
                "المجموعة غير موجودة.");

// ==============================
// Create Payment
// ==============================

var receivedByUser = await _context.Users
                .Where(u => u.Id == _tenantContext.UserId)
                .Select(u => u.FullName)
                .FirstOrDefaultAsync(cancellationToken);

            var payment = new Payment
            {
                StudentId = request.StudentId,
                GroupId = request.GroupId,
                PaymentDate = DateTime.Now,
                BillingPeriod = request.BillingPeriod,
                SessionId = request.SessionId,
                Notes = request.Notes,
                CreatedBy = _tenantContext.UserId,
                ReceivedBy = _tenantContext.UserId,
                ReceivedByName = receivedByUser ?? _tenantContext.UserId.ToString(),
                ReceivedAt = DateTime.UtcNow
            };

        decimal totalAmount = 0;
        decimal previousPaid = 0;
        decimal paidAmount = 0;
        decimal remainingAmount = 0;

        PaymentStatus status = PaymentStatus.FullyPaid;

        // ============================================================
        // Session Payment
        // ============================================================

        if (request.SessionId.HasValue)
        {
            var session = await _repository.SessionRepository
                .GetByIdAsync(request.SessionId.Value);

            if (session is null)
                return NotFound<string>(
                    "الحصة غير موجودة.");

            // ==============================
            // Check If Session Already Paid
            // ==============================

            var alreadyPaid =
                await _repository.PaymentRepository
                    .ExistsSessionPaymentAsync(
                        request.StudentId,
                        session.Id,
                        cancellationToken);

            if (alreadyPaid)
                return BadRequest<string>(
                    "تم دفع هذه الحصة مسبقاً.");

            // ==============================
            // Session Financial Values
            // ==============================

            totalAmount = session.SessionPrice;
            paidAmount = session.SessionPrice;
            remainingAmount = 0;
            status = PaymentStatus.FullyPaid;

            payment.StudentAmounts.Add(
                new StudentAmount
                {
                    Amount = session.SessionPrice,
                    TotalAmount = totalAmount,
                    PaidAmount = paidAmount,
                    RemainingAmount = remainingAmount,
                    Status = status,
                    CreatedBy = _tenantContext.UserId
                });
        }

        // ============================================================
        // Monthly Payment
        // ============================================================

        else
        {
            // ==============================
            // Validate Billing Period
            // ==============================

            if (!request.BillingPeriod.HasValue)
            {
                return BadRequest<string>(
                    "الشهر المستحق مطلوب.");
            }

            // ==============================
            // Validate Payment Amount
            // ==============================

            if (request.Amount <= 0)
            {
                return BadRequest<string>(
                    "قيمة الدفعة يجب أن تكون أكبر من صفر.");
            }

            // ========================================================
            // Get Active Student Group
            // ========================================================

            var activeStudentGroup = student.StudentGroups
                .FirstOrDefault(sg =>
                    sg.GroupId == request.GroupId &&
                    sg.IsActive &&
                    sg.LeftAt == null);

            if (activeStudentGroup is null)
            {
                return BadRequest<string>(
                    "الطالب غير مشترك في هذه المجموعة.");
            }

            // ========================================================
            // Student Join Billing Period
            // ========================================================

            var joinBillingPeriod = new DateOnly(
                activeStudentGroup.JoinDate.Year,
                activeStudentGroup.JoinDate.Month,
                1);

            // ========================================================
            // System Billing Start
            // ========================================================
            // The system started recording payments from August 2026.

            var systemStartBillingPeriod =
                new DateOnly(2026, 8, 1);

            // ========================================================
            // Requested Billing Period
            // ========================================================

            var requestedBillingPeriod = new DateOnly(
                request.BillingPeriod.Value.Year,
                request.BillingPeriod.Value.Month,
                1);

            // ========================================================
            // Determine First Billing Period To Check
            // ========================================================
            // We start from the later of:
            // 1. Student's join month
            // 2. System's billing start month

            var firstBillingPeriodToCheck =
                joinBillingPeriod > systemStartBillingPeriod
                    ? joinBillingPeriod
                    : systemStartBillingPeriod;

            // ========================================================
            // Prevent Paying A Month Before Join Date
            // ========================================================

            if (requestedBillingPeriod < joinBillingPeriod)
            {
                return BadRequest<string>(
                    $"لا يمكن تسجيل دفع شهر {requestedBillingPeriod:MM/yyyy} " +
                    $"لأن الطالب انضم إلى المجموعة في شهر {joinBillingPeriod:MM/yyyy}.");
            }

            // ========================================================
            // Check Previous Unpaid Months
            // ========================================================

            var checkingBillingPeriod =
                firstBillingPeriodToCheck;

            while (checkingBillingPeriod < requestedBillingPeriod)
            {
                var isFullyPaid =
                    await _repository.PaymentRepository
                        .IsMonthlyPaymentFullyPaidAsync(
                            request.StudentId,
                            checkingBillingPeriod,
                            cancellationToken);

                if (!isFullyPaid)
                {
                    return BadRequest<string>(
                        $"لا يمكن تسجيل دفع شهر {requestedBillingPeriod:MM/yyyy}، " +
                        $"لأن شهر {checkingBillingPeriod:MM/yyyy} " +
                        $"غير مدفوع بالكامل.");
                }

                checkingBillingPeriod =
                    checkingBillingPeriod.AddMonths(1);
            }

            // ========================================================
            // Get Last Payment For Requested Month
            // ========================================================

            var lastStudentAmount =
                await _repository.PaymentRepository
                    .GetLastStudentAmountAsync(
                        request.StudentId,
                        requestedBillingPeriod,
                        cancellationToken);

            // ========================================================
            // Calculate Monthly Amount
            // ========================================================

            int? billedSessions;

            if (lastStudentAmount is not null && !request.SessionsCount.HasValue)
            {
                totalAmount = lastStudentAmount.TotalAmount;
                billedSessions = lastStudentAmount.BilledSessions;
            }
            else
            {
                var billing = MonthlyBillingCalculator.Calculate(
                    group.MonthlyPrice,
                    student.CustomMonthlyPrice,
                    group.SessionsPerMonth,
                    request.SessionsCount);

                totalAmount = billing.TotalAmount;
                billedSessions = billing.IsFullMonth ? null : billing.BilledSessions;
            }

            if (totalAmount <= 0)
            {
                return BadRequest<string>(
                    "لا يمكن حساب مبلغ مستحق لهذا الشهر. برجاء مراجعة عدد الحصص أو سعر المجموعة.");
            }

            // ========================================================
            // Previous Paid Amount
            // ========================================================

            previousPaid = lastStudentAmount?.PaidAmount ?? 0;

            if (previousPaid > totalAmount)
            {
                return BadRequest<string>(
                    $"الطالب دفع بالفعل {previousPaid:0.##} ج.م لهذا الشهر، " +
                    $"وهو أكبر من المستحق الجديد {totalAmount:0.##} ج.م بعد تعديل عدد الحصص.");
            }

            paidAmount = previousPaid + request.Amount;

            if (paidAmount > totalAmount)
            {
                return BadRequest<string>(
                    $"قيمة الدفعة أكبر من المتبقي. " +
                    $"المستحق {totalAmount:0.##} ج.م، " +
                    $"المدفوع سابقاً {previousPaid:0.##} ج.م، " +
                    $"المتبقي {(totalAmount - previousPaid):0.##} ج.م.");
            }

            remainingAmount = totalAmount - paidAmount;

            status = remainingAmount == 0
                ? PaymentStatus.FullyPaid
                : PaymentStatus.PartialPaid;

            payment.StudentAmounts.Add(new StudentAmount
            {
                Amount = request.Amount,
                TotalAmount = totalAmount,
                PaidAmount = paidAmount,
                RemainingAmount = remainingAmount,
                BilledSessions = billedSessions,
                Status = status,
                CreatedBy = _tenantContext.UserId
            });
        }

        // ==============================
        // Save Payment
        // ==============================

        // The per-center receipt number is reserved and the payment inserted in
        // ONE transaction: if the insert fails the counter is rolled back and no
        // number is consumed. The counter is bumped with a single atomic
        // statement (never MAX+1), so concurrent payments stay unique.
        var receiptCenterId = _tenantContext.CenterId;

        var executionStrategy = _context.Database.CreateExecutionStrategy();

        try
        {
            await executionStrategy.ExecuteAsync(async () =>
            {
                await using var transaction =
                    await _context.Database.BeginTransactionAsync(cancellationToken);

                if (receiptCenterId.HasValue)
                {
                    payment.ReceiptNumber = await _receiptNumberService
                        .NextAsync(receiptCenterId.Value, cancellationToken);
                }

                await _repository.PaymentRepository
                    .AddAsync(payment);

                await _repository.SaveChangesAsync();

                await transaction.CommitAsync(cancellationToken);
            });
        }
        catch (Exception ex)
        {
            return BadRequest<string>(ex.InnerException?.Message ?? ex.Message);
        }

        // ==============================
        // SignalR Notification
        // ==============================

        #region SignalR

        var financialReportDto =
            new FinancialReportDto
            {
                StudentId = request.StudentId,

                Amount = request.Amount,

                BillingPeriod =
                    request.BillingPeriod,

                Notes = request.Notes,

                PaidAmount =
                    paidAmount,

                PaymentDate =
                    payment.PaymentDate,

                RemainingAmount =
                    remainingAmount,

                Status =
                    status,

                TotalAmount =
                    totalAmount
            };

        await _paymentNotificationService
            .PaymentAdded(financialReportDto);

        #endregion

        return Success(
            payment.Id.ToString(),
            "تم تسجيل عملية الدفع بنجاح.");
    }
}
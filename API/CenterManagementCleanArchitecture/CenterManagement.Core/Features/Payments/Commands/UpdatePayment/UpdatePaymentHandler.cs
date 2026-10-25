using CenterManagement.Core.Features.Payments.Commands.Models;
using CenterManagement.Data.Entities;
using CenterManagement.Infrustructure.InfrastructureBases.Bases;

namespace CenterManagement.Core.Features.Payments.Commands.Handlers;

public class UpdatePaymentHandler : ResponseHandler,
    IRequestHandler<UpdatePaymentCommand, Response<string>>
{
    private readonly IRepositoryManager _repository;
    private readonly IPaymentNotificationService _paymentNotificationService;
    private readonly IUserScopeService _scopeService;
    private readonly ITenantContext _tenantContext;

    public UpdatePaymentHandler(
        IRepositoryManager repository,
        IStringLocalizer<SharedResources> stringLocalizer,
        IPaymentNotificationService paymentNotificationService,
        IUserScopeService scopeService,
        ITenantContext tenantContext)
        : base(stringLocalizer)
    {
        _repository = repository;
        _paymentNotificationService = paymentNotificationService;
        _scopeService = scopeService;
        _tenantContext = tenantContext;
    }

    public async Task<Response<string>> Handle(
        UpdatePaymentCommand request,
        CancellationToken cancellationToken)
    {
        // =========================================
        // Assistants may record payments but never edit them.
        // =========================================

        if (_tenantContext.Role == AppRoles.Assistant)
            return Forbidden<string>(
                "لا يمكن للمساعد تعديل عملية دفع. تواصل مع المعلم أو إدارة المركز.");

        var scope = await _scopeService.ResolveAsync(cancellationToken);

        // =========================================
        // Get Payment With StudentAmounts
        // =========================================

        var payment = await _repository.PaymentRepository
            .GetPaymentWithStudentAmountsAsync(
                request.Id,
                cancellationToken);

        if (payment is null || !scope.Allows(payment.GroupId))
        {
            return NotFound<string>(
                "عملية الدفع غير موجودة.");
        }

        // =========================================
        // Validate Student
        // =========================================

        var student = await _repository.StudentRepository
            .GetByIdWithGroupAsync(request.StudentId);

        if (student is null)
        {
            return NotFound<string>(
                "الطالب غير موجود.");
        }

        // =========================================
        // Validate Group
        // =========================================

        var group = await _repository.GroupRepository
            .GetByIdAsync(request.GroupId);

        if (group is null)
        {
            return NotFound<string>(
                "المجموعة غير موجودة.");
        }

        // =========================================
        // Prevent Changing Student
        // =========================================

        if (payment.StudentId != request.StudentId)
        {
            return BadRequest<string>(
                "لا يمكن تغيير الطالب لعملية دفع موجودة.");
        }

        // ============================================================
        // Session Payment
        // ============================================================

        if (request.SessionId.HasValue)
        {
            // لا نسمح بتحويل Monthly Payment إلى Session Payment
            if (payment.SessionId is null)
            {
                return BadRequest<string>(
                    "لا يمكن تحويل عملية دفع شهرية إلى دفع حصة.");
            }

            // لا نسمح بتغيير الحصة نفسها
            if (payment.SessionId != request.SessionId)
            {
                return BadRequest<string>(
                    "لا يمكن تغيير الحصة لعملية دفع موجودة.");
            }

            // =========================================
            // Validate Session
            // =========================================

            var session = await _repository.SessionRepository
                .GetByIdAsync(request.SessionId.Value);

            if (session is null)
            {
                return NotFound<string>(
                    "الحصة غير موجودة.");
            }

            // =========================================
            // Update Payment Basic Data
            // =========================================

            payment.GroupId = request.GroupId;
            payment.SessionId = request.SessionId;
            payment.BillingPeriod = null;
            payment.Notes = request.Notes;

            // =========================================
            // Get Existing StudentAmount
            // =========================================

            var studentAmount =
                payment.StudentAmounts.FirstOrDefault();

            if (studentAmount is null)
            {
                studentAmount = new StudentAmount
                {
                    Id = Guid.NewGuid(),
                    PaymentId = payment.Id
                };

                payment.StudentAmounts.Add(studentAmount);
            }

            // =========================================
            // Update StudentAmount
            // =========================================

            studentAmount.Amount =
                session.SessionPrice;

            studentAmount.TotalAmount =
                session.SessionPrice;

            studentAmount.PaidAmount =
                session.SessionPrice;

            studentAmount.RemainingAmount = 0;

            studentAmount.Status =
                PaymentStatus.FullyPaid;

            // =========================================
            // Save Changes
            // =========================================

            await _repository.SaveChangesAsync();

            // =========================================
            // SignalR - Session Payment
            // =========================================

            var sessionFinancialReport =
                new FinancialReportDto
                {
                    StudentId =
                        payment.StudentId,

                    Amount =
                        session.SessionPrice,

                    BillingPeriod =
                        null,

                    Notes =
                        payment.Notes,

                    PaidAmount =
                        session.SessionPrice,

                    PaymentDate =
                        payment.PaymentDate,

                    RemainingAmount =
                        0,

                    Status =
                        PaymentStatus.FullyPaid,

                    TotalAmount =
                        session.SessionPrice
                };

            await _paymentNotificationService
                .PaymentUpdated(
                    sessionFinancialReport);

            return Success(
                "تم تعديل عملية الدفع بنجاح.");
        }

        // ============================================================
        // Monthly Payment Validation
        // ============================================================

        if (!request.BillingPeriod.HasValue)
        {
            return BadRequest<string>(
                "الشهر المستحق مطلوب.");
        }

        if (request.Amount <= 0)
        {
            return BadRequest<string>(
                "قيمة الدفعة يجب أن تكون أكبر من صفر.");
        }

        // ============================================================
        // Prevent Converting Session Payment To Monthly
        // ============================================================

        if (payment.SessionId.HasValue)
        {
            return BadRequest<string>(
                "لا يمكن تحويل عملية دفع حصة إلى دفع شهري.");
        }

        // ============================================================
        // Get Old & New Billing Period
        // ============================================================

        if (!payment.BillingPeriod.HasValue)
        {
            return BadRequest<string>(
                "عملية الدفع الحالية ليس لها شهر مستحق.");
        }

        var oldBillingPeriod =
            new DateOnly(
                payment.BillingPeriod.Value.Year,
                payment.BillingPeriod.Value.Month,
                1);

        var newBillingPeriod =
            new DateOnly(
                request.BillingPeriod.Value.Year,
                request.BillingPeriod.Value.Month,
                1);

        // ============================================================
        // Get Active Student Group
        // ============================================================

        var activeStudentGroup =
            student.StudentGroups.FirstOrDefault(
                sg =>
                    sg.GroupId == request.GroupId &&
                    sg.IsActive &&
                    sg.LeftAt == null);

        if (activeStudentGroup is null)
        {
            return BadRequest<string>(
                "الطالب غير مشترك في هذه المجموعة.");
        }

        // ============================================================
        // Student Join Billing Period
        // ============================================================

        var joinBillingPeriod =
            new DateOnly(
                activeStudentGroup.JoinDate.Year,
                activeStudentGroup.JoinDate.Month,
                1);

        // ============================================================
        // System Billing Start
        // ============================================================

        // النظام بدأ تسجيل المدفوعات من أغسطس 2026
        var systemStartBillingPeriod =
            new DateOnly(2026, 8, 1);

        // ============================================================
        // First Billing Period To Check
        // ============================================================

        var firstBillingPeriodToCheck =
            joinBillingPeriod > systemStartBillingPeriod
                ? joinBillingPeriod
                : systemStartBillingPeriod;

        // ============================================================
        // Prevent Payment Before Join Date
        // ============================================================

        if (newBillingPeriod < joinBillingPeriod)
        {
            return BadRequest<string>(
                $"لا يمكن تعديل عملية الدفع إلى شهر " +
                $"{newBillingPeriod:MM/yyyy} " +
                $"لأن الطالب انضم إلى المجموعة في شهر " +
                $"{joinBillingPeriod:MM/yyyy}.");
        }

        // ============================================================
        // Monthly Amount
        // ============================================================

        var totalAmount =
            student.CustomMonthlyPrice ??
            group.MonthlyPrice;

        // ============================================================
        // Get Old Month Payments
        // ============================================================

        var oldMonthPayments =
            await _repository.PaymentRepository
                .GetMonthlyPaymentsAsync(
                    payment.StudentId,
                    oldBillingPeriod,
                    cancellationToken);

        // ============================================================
        // Get New Month Payments
        // ============================================================

        var newMonthPayments =
            await _repository.PaymentRepository
                .GetMonthlyPaymentsAsync(
                    payment.StudentId,
                    newBillingPeriod,
                    cancellationToken);

        // ============================================================
        // Current Payment Values For SignalR
        // ============================================================

        decimal currentPaidAmount = 0;

        decimal currentRemainingAmount = 0;

        PaymentStatus currentStatus =
            PaymentStatus.PartialPaid;

        // ============================================================
        // Validate Previous Months
        // AFTER The Update
        // ============================================================

        var checkingBillingPeriod =
            firstBillingPeriodToCheck;

        while (checkingBillingPeriod < newBillingPeriod)
        {
            // Get payments for the month
            var previousMonthPayments =
                await _repository.PaymentRepository
                    .GetMonthlyPaymentsAsync(
                        payment.StudentId,
                        checkingBillingPeriod,
                        cancellationToken);

            // ========================================================
            // Remove The Payment Being Edited
            //
            // Important:
            // If we move 10 -> 11, the payment must NOT be counted
            // as a payment for month 10.
            // ========================================================

            var paymentsAfterUpdate =
                previousMonthPayments
                    .Where(x => x.Id != payment.Id)
                    .ToList();

            // ========================================================
            // Calculate Paid Amount For This Month
            // ========================================================

            decimal paidForMonth = 0;

            foreach (var previousPayment in paymentsAfterUpdate)
            {
                var amount =
                    previousPayment.StudentAmounts
                        .FirstOrDefault();

                if (amount is not null)
                {
                    paidForMonth += amount.Amount;
                }
            }

            // ========================================================
            // Previous Month Must Be Fully Paid
            // ========================================================

            if (paidForMonth < totalAmount)
            {
                return BadRequest<string>(
                    $"لا يمكن تعديل عملية الدفع إلى شهر " +
                    $"{newBillingPeriod:MM/yyyy}، " +
                    $"لأن شهر {checkingBillingPeriod:MM/yyyy} " +
                    $"غير مدفوع بالكامل.");
            }

            checkingBillingPeriod =
                checkingBillingPeriod.AddMonths(1);
        }

        // ============================================================
        // CASE 1
        // Same Billing Period
        // ============================================================

        if (oldBillingPeriod == newBillingPeriod)
        {
            var orderedPayments =
                oldMonthPayments
                    .OrderBy(x => x.PaymentDate)
                    .ThenBy(x => x.Id)
                    .ToList();

            // ========================================================
            // Calculate Total After Edit
            // ========================================================

            decimal totalPaidAfterEdit = 0;

            foreach (var currentPayment in orderedPayments)
            {
                var currentStudentAmount =
                    currentPayment.StudentAmounts
                        .FirstOrDefault();

                if (currentPayment.Id == payment.Id)
                {
                    totalPaidAfterEdit +=
                        request.Amount;
                }
                else if (currentStudentAmount is not null)
                {
                    totalPaidAfterEdit +=
                        currentStudentAmount.Amount;
                }
            }

            // ========================================================
            // Prevent Overpayment
            // ========================================================

            if (totalPaidAfterEdit > totalAmount)
            {
                return BadRequest<string>(
                    "قيمة الدفعات أكبر من المبلغ المستحق.");
            }

            // ========================================================
            // Recalculate Same Month
            // ========================================================

            decimal runningPaid = 0;

            foreach (var currentPayment in orderedPayments)
            {
                var studentAmount =
                    currentPayment.StudentAmounts
                        .FirstOrDefault();

                if (studentAmount is null)
                {
                    studentAmount = new StudentAmount
                    {
                        Id = Guid.NewGuid(),
                        PaymentId = currentPayment.Id
                    };

                    currentPayment.StudentAmounts
                        .Add(studentAmount);
                }

                decimal paymentAmount;

                if (currentPayment.Id == payment.Id)
                {
                    paymentAmount =
                        request.Amount;

                    currentPayment.GroupId =
                        request.GroupId;

                    currentPayment.SessionId =
                        null;

                    currentPayment.BillingPeriod =
                        request.BillingPeriod;

                    currentPayment.Notes =
                        request.Notes;
                }
                else
                {
                    paymentAmount =
                        studentAmount.Amount;
                }

                runningPaid +=
                    paymentAmount;

                var remainingAmount =
                    Math.Max(
                        totalAmount - runningPaid,
                        0);

                var status =
                    remainingAmount == 0
                        ? PaymentStatus.FullyPaid
                        : PaymentStatus.PartialPaid;

                studentAmount.Amount =
                    paymentAmount;

                studentAmount.TotalAmount =
                    totalAmount;

                studentAmount.PaidAmount =
                    Math.Min(
                        runningPaid,
                        totalAmount);

                studentAmount.RemainingAmount =
                    remainingAmount;

                studentAmount.Status =
                    status;

                if (currentPayment.Id == payment.Id)
                {
                    currentPaidAmount =
                        studentAmount.PaidAmount;

                    currentRemainingAmount =
                        studentAmount.RemainingAmount;

                    currentStatus =
                        studentAmount.Status;
                }
            }
        }

        // ============================================================
        // CASE 2
        // Moving Payment To Another Month
        // ============================================================

        else
        {
            // ========================================================
            // OLD MONTH
            // Remove Current Payment
            // ========================================================

            var oldPaymentsWithoutCurrent =
                oldMonthPayments
                    .Where(x => x.Id != payment.Id)
                    .OrderBy(x => x.PaymentDate)
                    .ThenBy(x => x.Id)
                    .ToList();

            // ========================================================
            // Recalculate Old Month
            // ========================================================

            decimal oldRunningPaid = 0;

            foreach (var currentPayment in oldPaymentsWithoutCurrent)
            {
                var studentAmount =
                    currentPayment.StudentAmounts
                        .FirstOrDefault();

                if (studentAmount is null)
                {
                    studentAmount = new StudentAmount
                    {
                        Id = Guid.NewGuid(),
                        PaymentId = currentPayment.Id
                    };

                    currentPayment.StudentAmounts
                        .Add(studentAmount);
                }

                var paymentAmount =
                    studentAmount.Amount;

                oldRunningPaid +=
                    paymentAmount;

                var remainingAmount =
                    Math.Max(
                        totalAmount - oldRunningPaid,
                        0);

                var status =
                    remainingAmount == 0
                        ? PaymentStatus.FullyPaid
                        : PaymentStatus.PartialPaid;

                studentAmount.TotalAmount =
                    totalAmount;

                studentAmount.PaidAmount =
                    Math.Min(
                        oldRunningPaid,
                        totalAmount);

                studentAmount.RemainingAmount =
                    remainingAmount;

                studentAmount.Status =
                    status;
            }

            // ========================================================
            // NEW MONTH
            // Add Current Payment
            // ========================================================

            if (!newMonthPayments.Any(
                    x => x.Id == payment.Id))
            {
                newMonthPayments.Add(payment);
            }

            // ========================================================
            // Order New Month Payments
            // ========================================================

            var orderedNewPayments =
                newMonthPayments
                    .OrderBy(x => x.PaymentDate)
                    .ThenBy(x => x.Id)
                    .ToList();

            // ========================================================
            // Calculate New Month Total
            // ========================================================

            decimal newTotalPaid = 0;

            foreach (var currentPayment in orderedNewPayments)
            {
                var currentStudentAmount =
                    currentPayment.StudentAmounts
                        .FirstOrDefault();

                if (currentPayment.Id == payment.Id)
                {
                    newTotalPaid +=
                        request.Amount;
                }
                else if (currentStudentAmount is not null)
                {
                    newTotalPaid +=
                        currentStudentAmount.Amount;
                }
            }

            // ========================================================
            // Prevent Overpayment
            // ========================================================

            if (newTotalPaid > totalAmount)
            {
                return BadRequest<string>(
                    "قيمة الدفعات أكبر من المبلغ المستحق.");
            }

            // ========================================================
            // Update Current Payment
            // ========================================================

            payment.GroupId =
                request.GroupId;

            payment.SessionId =
                null;

            payment.BillingPeriod =
                request.BillingPeriod;

            payment.Notes =
                request.Notes;

            // ========================================================
            // Recalculate New Month
            // ========================================================

            decimal newRunningPaid = 0;

            foreach (var currentPayment in orderedNewPayments)
            {
                var studentAmount =
                    currentPayment.StudentAmounts
                        .FirstOrDefault();

                if (studentAmount is null)
                {
                    studentAmount = new StudentAmount
                    {
                        Id = Guid.NewGuid(),
                        PaymentId = currentPayment.Id
                    };

                    currentPayment.StudentAmounts
                        .Add(studentAmount);
                }

                decimal paymentAmount;

                if (currentPayment.Id == payment.Id)
                {
                    paymentAmount =
                        request.Amount;
                }
                else
                {
                    paymentAmount =
                        studentAmount.Amount;
                }

                newRunningPaid +=
                    paymentAmount;

                var remainingAmount =
                    Math.Max(
                        totalAmount - newRunningPaid,
                        0);

                var status =
                    remainingAmount == 0
                        ? PaymentStatus.FullyPaid
                        : PaymentStatus.PartialPaid;

                studentAmount.Amount =
                    paymentAmount;

                studentAmount.TotalAmount =
                    totalAmount;

                studentAmount.PaidAmount =
                    Math.Min(
                        newRunningPaid,
                        totalAmount);

                studentAmount.RemainingAmount =
                    remainingAmount;

                studentAmount.Status =
                    status;

                if (currentPayment.Id == payment.Id)
                {
                    currentPaidAmount =
                        studentAmount.PaidAmount;

                    currentRemainingAmount =
                        studentAmount.RemainingAmount;

                    currentStatus =
                        studentAmount.Status;
                }
            }
        }

        // =========================================================
        // Save Changes
        // =========================================================

        await _repository.SaveChangesAsync();

        // =========================================================
        // SignalR
        // =========================================================

        var financialReportDto =
            new FinancialReportDto
            {
                StudentId =
                    payment.StudentId,

                Amount =
                    request.Amount,

                BillingPeriod =
                    payment.BillingPeriod,

                Notes =
                    payment.Notes,

                PaidAmount =
                    currentPaidAmount,

                PaymentDate =
                    payment.PaymentDate,

                RemainingAmount =
                    currentRemainingAmount,

                Status =
                    currentStatus,

                TotalAmount =
                    totalAmount
            };

        await _paymentNotificationService
            .PaymentUpdated(
                financialReportDto);

        return Success(
            "تم تعديل عملية الدفع بنجاح.");
    }
}
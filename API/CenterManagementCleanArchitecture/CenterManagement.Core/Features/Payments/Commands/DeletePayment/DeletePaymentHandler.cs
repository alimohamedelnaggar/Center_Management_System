using CenterManagement.Core.Bases;
using CenterManagement.Core.Features.Payments.Commands.DeletePayment;
using CenterManagement.Core.Features.Payments.Commands.Models;
using CenterManagement.Data.Enums;
using CenterManagement.Infrustructure.InfrastructureBases.Bases;
using MediatR;

namespace CenterManagement.Core.Features.Payments.Commands.Handlers;

public class DeletePaymentHandler : ResponseHandler,
    IRequestHandler<DeletePaymentCommand, Response<bool>>
{
    private readonly IRepositoryManager _repository;
    private readonly IPaymentNotificationService _paymentNotificationService;
    private readonly IUserScopeService _scopeService;
    private readonly ITenantContext _tenantContext;

    public DeletePaymentHandler(
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

    public async Task<Response<bool>> Handle(
        DeletePaymentCommand request,
        CancellationToken cancellationToken)
    {
        // ==============================
        // Assistants may record payments but never delete them.
        // ==============================

        if (_tenantContext.Role == AppRoles.Assistant)
            return Forbidden<bool>(
                "لا يمكن للمساعد حذف عملية دفع. تواصل مع المعلم أو إدارة المركز.");

        var scope = await _scopeService.ResolveAsync(cancellationToken);

        // ==============================
        // Get Payment
        // ==============================

        var payment = await _repository.PaymentRepository
            .GetPaymentWithStudentAmountsAsync(
                request.PaymentId,
                cancellationToken);

        if (payment is null || !scope.Allows(payment.GroupId))
            return NotFound<bool>(
                "الدفع غير موجود.");


        // ============================================================
        // Session Payment
        // ============================================================

        if (payment.SessionId.HasValue)
        {
            await _repository.PaymentRepository.DeleteAsync(payment);

            await _repository.SaveChangesAsync();

            // ==============================
            // SignalR Notification
            // ==============================

            await _paymentNotificationService
                .PaymentDeleted(payment.Id);

            return Success(true);
        }


        // ============================================================
        // Monthly Payment
        // ============================================================

        if (!payment.BillingPeriod.HasValue)
            return BadRequest<bool>(
                "بيانات الدفع غير صحيحة.");

        var billingPeriod = payment.BillingPeriod.Value;


        // ============================================================
        // Get Student
        // ============================================================

        var student = await _repository.StudentRepository
            .GetByIdWithGroupAsync(payment.StudentId);

        if (student is null)
            return NotFound<bool>(
                "الطالب غير موجود.");


        // ============================================================
        // Get Payment Group
        // ============================================================

        var studentGroup = student.StudentGroups
            .FirstOrDefault(sg =>
                sg.GroupId == payment.GroupId &&
                sg.IsActive &&
                sg.LeftAt == null);

        if (studentGroup is null)
            return BadRequest<bool>(
                "الطالب غير مشترك في هذه المجموعة.");


        // ============================================================
        // Get All Payments For This Month
        // ============================================================

        var monthlyPayments =
            await _repository.PaymentRepository
                .GetMonthlyPaymentsAsync(
                    payment.StudentId,
                    billingPeriod,
                    cancellationToken);


        // ============================================================
        // Remove Payment
        // ============================================================

        await _repository.PaymentRepository.DeleteAsync(payment);


        // ============================================================
        // Monthly Amount
        // ============================================================

        var totalAmount =
            student.CustomMonthlyPrice ??
            studentGroup.Group.MonthlyPrice;


        // ============================================================
        // Payments Remaining After Delete
        // ============================================================

        var remainingPayments = monthlyPayments
            .Where(x => x.Id != payment.Id)
            .ToList();


        // ============================================================
        // Calculate Paid Amount
        // ============================================================

        decimal paidAmount = 0;

        foreach (var remainingPayment in remainingPayments)
        {
            var studentAmount = remainingPayment.StudentAmounts
                .FirstOrDefault();

            if (studentAmount is not null)
            {
                paidAmount += studentAmount.Amount;
            }
        }

        // ============================================================
        // Calculate Remaining Amount
        // ============================================================

        var remainingAmount =
            totalAmount - paidAmount;

        if (remainingAmount < 0)
            remainingAmount = 0;


        // ============================================================
        // Determine Status
        // ============================================================

        var status = paidAmount switch
        {
            0 => PaymentStatus.NotPaid,

            var amount when amount < totalAmount
                => PaymentStatus.PartialPaid,

            _ => PaymentStatus.FullyPaid
        };


        // ============================================================
        // Update Student Amounts
        // ============================================================

        foreach (var remainingPayment in remainingPayments)
        {
            var studentAmount = remainingPayment.StudentAmounts
                .FirstOrDefault();

            if (studentAmount is null)
                continue;

            studentAmount.TotalAmount = totalAmount;

            studentAmount.PaidAmount = paidAmount;

            studentAmount.RemainingAmount = remainingAmount;

            studentAmount.Status = status;
        }


        // ============================================================
        // Save Changes
        // ============================================================

        await _repository.SaveChangesAsync();


        // ============================================================
        // SignalR Notification
        // ============================================================

        await _paymentNotificationService
            .PaymentDeleted(payment.Id);


        // ============================================================
        // Success
        // ============================================================

        return Success(true);
    }
}
using CenterManagement.Core.Bases;
using CenterManagement.Data.Entities.Users;
using CenterManagement.Infrustructure.InfrastructureBases.Bases;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Localization;

namespace CenterManagement.Core.Features.UsersFeature.AssistantPayments.Commands.Handlers;

public sealed class UpdateAssistantSalaryPaymentCommandHandler
    : ResponseHandler,
      IRequestHandler<UpdateAssistantSalaryPaymentCommand, Response<string>>
{
    private readonly UserManager<User> _userManager;
    private readonly IRepositoryManager _repositoryManager;

    public UpdateAssistantSalaryPaymentCommandHandler(
        UserManager<User> userManager,
        IRepositoryManager repositoryManager,
        IStringLocalizer<SharedResources> localizer)
        : base(localizer)
    {
        _userManager = userManager;
        _repositoryManager = repositoryManager;
    }

    public async Task<Response<string>> Handle(
        UpdateAssistantSalaryPaymentCommand request,
        CancellationToken cancellationToken)
    {
        var payment = await _repositoryManager
            .AssistantPaymentRepository
            .GetPaymentByIdAsync(request.PaymentId, cancellationToken);

        if (payment is null)
            return NotFound<string>("عملية صرف المرتب غير موجودة.");

        var assistant = await _userManager.Users
            .OfType<Assistent>()
            .FirstOrDefaultAsync(x => x.Id == payment.AssistantId, cancellationToken);

        if (assistant is null)
            return NotFound<string>("المساعد غير موجود.");

        var amount = Math.Round(request.Amount, 2);

        if (amount <= 0)
            return BadRequest<string>("المبلغ يجب أن يكون أكبر من صفر.");

        // إجمالي ما تم صرفه فعلياً خلال نفس الشهر مع استبعاد العملية الحالية
        var otherPaidForMonth = await _repositoryManager
            .AssistantPaymentRepository
            .GetPaidAmountForMonthExceptAsync(
                payment.AssistantId,
                payment.Month,
                payment.Year,
                payment.Id,
                cancellationToken);

        // أقصى مبلغ يمكن حفظه لهذه العملية دون تجاوز المرتب الأساسي
        var allowed = Math.Max(0, Math.Round(assistant.Salary - otherPaidForMonth, 2));

        if (amount > allowed)
            return BadRequest<string>(
                $"المبلغ المدخل أكبر من المتبقي (المتبقي {allowed:0.##} ج.م).");

        payment.NetSalary = amount;
        payment.IsPaid = true;
        payment.PaidAt = request.PaidAt ?? payment.PaidAt;
        payment.Notes = request.Notes;
        payment.UpdatedAt = DateTime.Now;

        await _repositoryManager
            .AssistantPaymentRepository
            .UpdateAsync(payment);

        await _repositoryManager.SaveChangesAsync();

        return Success("تم تعديل عملية صرف المرتب بنجاح.");
    }
}

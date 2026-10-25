using CenterManagement.Core.Bases;
using CenterManagement.Data.Entities.Abstractions;
using CenterManagement.Data.Entities.Users;
using CenterManagement.Infrustructure.InfrastructureBases.Bases;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Localization;

namespace CenterManagement.Core.Features.UsersFeature.AssistantPayments.Commands.Handlers;

public sealed class PayAssistantSalaryCommandHandler
    : ResponseHandler,
      IRequestHandler<PayAssistantSalaryCommand, Response<string>>
{
    private readonly UserManager<User> _userManager;
    private readonly IRepositoryManager _repositoryManager;
    private readonly ITenantContext _tenantContext;

    public PayAssistantSalaryCommandHandler(
        UserManager<User> userManager,
        IRepositoryManager repositoryManager,
        ITenantContext tenantContext,
        IStringLocalizer<SharedResources> localizer)
        : base(localizer)
    {
        _userManager = userManager;
        _repositoryManager = repositoryManager;
        _tenantContext = tenantContext;
    }

    public async Task<Response<string>> Handle(
        PayAssistantSalaryCommand request,
        CancellationToken cancellationToken)
    {
        var assistant = await _userManager.Users
            .OfType<Assistent>()
            .FirstOrDefaultAsync(x => x.Id == request.AssistantId, cancellationToken);

        if (assistant is null)
            return NotFound<string>("المساعد غير موجود.");

        // إجمالي ما تم صرفه فعلياً خلال نفس الشهر
        var paidForMonth = await _repositoryManager
            .AssistantPaymentRepository
            .GetPaidAmountForMonthAsync(
                request.AssistantId,
                request.Month,
                request.Year,
                cancellationToken);

        var remaining = Math.Max(0, Math.Round(assistant.Salary - paidForMonth, 2));

        if (remaining <= 0)
            return BadRequest<string>("تم صرف مرتب هذا الشهر بالكامل بالفعل.");

        decimal bonus = request.Bonus ?? 0;
        decimal deduction = request.Deduction ?? 0;

        // المبلغ الفعلي المُصرف في هذه العملية
        decimal amount;

        if (request.Amount.HasValue)
        {
            amount = Math.Round(request.Amount.Value, 2);

            if (amount <= 0)
                return BadRequest<string>("المبلغ المراد صرفه يجب أن يكون أكبر من صفر.");

            if (amount > remaining)
                return BadRequest<string>(
                    $"المبلغ المدخل أكبر من المتبقي (المتبقي {remaining:0.##} ج.م).");
        }
        else
        {
            // صرف كامل المتبقي مع الإضافات والخصومات
            amount = Math.Round(remaining + bonus - deduction, 2);

            if (amount <= 0)
                return BadRequest<string>("المبلغ المراد صرفه يجب أن يكون أكبر من صفر.");
        }

        var payment = new AssistantPayment
        {
            AssistantId = assistant.Id,

            Month = request.Month,
            Year = request.Year,

            BasicSalary = assistant.Salary,

            Bonus = request.Bonus,
            Deduction = request.Deduction,

            NetSalary = amount,

            IsPaid = true,
            PaidAt = request.PaidAt ?? DateTime.Now,

            Notes = request.Notes,

            CreatedBy = _tenantContext.UserId
        };

        await _repositoryManager
            .AssistantPaymentRepository
            .AddAsync(payment);

        await _repositoryManager.SaveChangesAsync();

        return Success("تم صرف المرتب بنجاح.");
    }
}
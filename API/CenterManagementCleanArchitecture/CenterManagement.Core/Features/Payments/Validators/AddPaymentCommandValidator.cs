using CenterManagement.Core.Features.Payments.Commands.Models;
using FluentValidation;

namespace CenterManagement.Core.Features.Payments.Commands.Validators;

public class AddPaymentValidator : AbstractValidator<AddPaymentCommand>
{
    public AddPaymentValidator()
    {
        RuleFor(x => x.StudentId)
            .NotEmpty()
            .WithMessage("الطالب مطلوب.");

        RuleFor(x => x.GroupId)
            .NotEmpty()
            .WithMessage("المجموعة مطلوبة.");

        RuleFor(x => x.Amount)
            .GreaterThan(0)
            .WithMessage("قيمة الدفعة يجب أن تكون أكبر من صفر.");

        RuleFor(x => x)
            .Must(x =>
                (x.SessionId.HasValue && !x.BillingPeriod.HasValue) ||
                (!x.SessionId.HasValue && x.BillingPeriod.HasValue))
            .WithMessage("يجب تحديد إما الحصة أو فترة الاشتراك الشهري فقط.");
        RuleFor(x => x.SessionsCount)
            .GreaterThan(0)
            .When(x => x.SessionsCount.HasValue)
            .WithMessage("عدد الحصص يجب أن يكون أكبر من صفر.");
    }
}
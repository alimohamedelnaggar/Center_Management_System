using CenterManagement.Core.Features.Centers.Commands.Models;
using CenterManagement.Data.AppMetaData;
using CenterManagement.Data.Enums;
using FluentValidation;

namespace CenterManagement.Core.Features.Centers.Commands.Validators;

public class OnboardCenterOwnerCommandValidator : AbstractValidator<OnboardCenterOwnerCommand>
{
    public OnboardCenterOwnerCommandValidator()
    {
        RuleFor(x => x.AccountType)
            .Must(t => string.IsNullOrWhiteSpace(t)
                       || t == AppRoles.CenterOwner
                       || t == AppRoles.Teacher)
            .WithMessage("نوع الحساب غير صحيح");

        RuleFor(x => x.OwnerFullName)
            .NotEmpty().WithMessage("الاسم مطلوب")
            .MaximumLength(150).WithMessage("الاسم يجب ألا يزيد عن 150 حرف");

        RuleFor(x => x.OwnerPhone)
            .NotEmpty().WithMessage("رقم الهاتف مطلوب")
            .Matches(@"^01[0-2,5]\d{8}$").WithMessage("رقم الهاتف غير صحيح");

        // Empty means "generate a temporary password"; when supplied it must be
        // strong enough for the Identity password policy.
        RuleFor(x => x.OwnerPassword)
            .MinimumLength(6).WithMessage("كلمة المرور يجب ألا تقل عن 6 أحرف")
            .When(x => !string.IsNullOrWhiteSpace(x.OwnerPassword));

        RuleFor(x => x.CenterName)
            .NotEmpty().WithMessage("اسم المركز مطلوب")
            .MaximumLength(200).WithMessage("اسم المركز يجب ألا يزيد عن 200 حرف");

        // A single-teacher center needs the teacher's subject.
        RuleFor(x => x.Subject)
            .NotEmpty().WithMessage("مادة المدرس مطلوبة لحساب مدرس فردي")
            .MaximumLength(100).WithMessage("المادة يجب ألا تزيد عن 100 حرف")
            .When(x => x.AccountType == AppRoles.Teacher);

        // Optional initial subscription. Only validated when a type is supplied.
        RuleFor(x => x.GraceDays)
            .GreaterThanOrEqualTo(0).WithMessage("أيام السماح لا يمكن أن تكون سالبة")
            .When(x => x.GraceDays.HasValue);

        RuleFor(x => x.Price)
            .GreaterThanOrEqualTo(0).WithMessage("السعر لا يمكن أن يكون سالبًا")
            .When(x => x.Price.HasValue);

        RuleFor(x => x.PaidAmount)
            .GreaterThanOrEqualTo(0).WithMessage("المدفوع لا يمكن أن يكون سالبًا")
            .When(x => x.PaidAmount.HasValue);

        RuleFor(x => x.SubscriptionEnd)
            .GreaterThan(x => x.SubscriptionStart!.Value)
            .WithMessage("تاريخ النهاية يجب أن يكون بعد تاريخ البداية")
            .When(x => x.SubscriptionType.HasValue
                       && x.SubscriptionType != SubscriptionPlanType.Lifetime
                       && x.SubscriptionStart.HasValue
                       && x.SubscriptionEnd.HasValue);
    }
}


namespace CenterManagement.Core.Features.Groups.Commands.Validations
{
    public class CreateGroupValidator : AbstractValidator<CreateGroupCommand>
    {
        public CreateGroupValidator()
        {
            RuleFor(x => x.Name)
                .NotEmpty().WithMessage("اسم المجموعة مطلوب.")
                .MaximumLength(100).WithMessage("اسم المجموعة لا يتجاوز 100 حرف.");

            RuleFor(x => x.MonthlyPrice)
                .GreaterThanOrEqualTo(0).WithMessage("سعر الشهر لا يمكن أن يكون بالسالب.");
            RuleFor(x => x.SessionsPerMonth)
                .InclusiveBetween(1, 31)
                .WithMessage("عدد حصص الشهر يجب أن يكون بين 1 و 31.");
        }

    }
}

using CenterManagement.Core.Helpers;
using FluentValidation;

public class AddAssistantValidator : AbstractValidator<AddAssistantCommand>
{
    public AddAssistantValidator()
    {
        RuleFor(x => x.FullName)
            .NotEmpty()
            .MaximumLength(150);

        RuleFor(x => x.PhoneNumber)
            .NotEmpty()
            .Matches(@"^01[0125][0-9]{8}$");

        RuleFor(x => x.Email)
            .MaximumLength(254).WithMessage("البريد الإلكتروني طويل جدًا")
            .Must(UserEmailHelper.IsValidOptional).WithMessage(UserEmailHelper.InvalidMessage)
            .When(x => !string.IsNullOrWhiteSpace(x.Email));

        RuleFor(x => x.Salary)
            .GreaterThan(0);

    }
}
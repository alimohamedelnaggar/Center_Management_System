using CenterManagement.Core.Helpers;
using FluentValidation;

namespace CenterManagement.Core.Features.UsersFeature.Assistant.Commands.Validators;

public sealed class EditAssistantValidator : AbstractValidator<EditAssistantCommand>
{
    public EditAssistantValidator()
    {
        RuleFor(x => x.Email)
            .MaximumLength(254).WithMessage("البريد الإلكتروني طويل جدًا")
            .Must(UserEmailHelper.IsValidOptional).WithMessage(UserEmailHelper.InvalidMessage)
            .When(x => !string.IsNullOrWhiteSpace(x.Email));
    }
}

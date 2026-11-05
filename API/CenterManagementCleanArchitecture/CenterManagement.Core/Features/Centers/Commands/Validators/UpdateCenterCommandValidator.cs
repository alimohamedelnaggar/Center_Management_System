using CenterManagement.Core.Features.Centers.Commands.Models;
using CenterManagement.Core.Helpers;
using FluentValidation;

namespace CenterManagement.Core.Features.Centers.Commands.Validators;

public sealed class UpdateCenterCommandValidator : AbstractValidator<UpdateCenterCommand>
{
    public UpdateCenterCommandValidator()
    {
        RuleFor(x => x.OwnerEmail)
            .MaximumLength(254).WithMessage("البريد الإلكتروني طويل جدًا")
            .Must(UserEmailHelper.IsValidOptional).WithMessage(UserEmailHelper.InvalidMessage)
            .When(x => !string.IsNullOrWhiteSpace(x.OwnerEmail));
    }
}

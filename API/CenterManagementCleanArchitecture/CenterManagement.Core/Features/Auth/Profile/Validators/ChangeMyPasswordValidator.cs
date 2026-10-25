using CenterManagement.Core.Features.Auth.Profile.Command.Models;
using FluentValidation;

namespace CenterManagement.Core.Features.Auth.Profile.Command.Validators;

public class ChangeMyPasswordValidator
    : AbstractValidator<ChangeMyPasswordCommand>
{
    public ChangeMyPasswordValidator()
    {
        RuleFor(x => x.CurrentPassword)
            .NotEmpty()
            .WithMessage("Current password is required.");

        RuleFor(x => x.NewPassword)
            .NotEmpty()
            .WithMessage("New password is required.")
            .MinimumLength(8)
            .WithMessage("Password must be at least 8 characters.");

        RuleFor(x => x.ConfirmPassword)
            .NotEmpty()
            .WithMessage("Confirm password is required.")
            .Equal(x => x.NewPassword)
            .WithMessage("Passwords do not match.");
    }
}
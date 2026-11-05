using CenterManagement.Core.Features.UsersFeature.Teacher.Commands.Models;
using CenterManagement.Core.Helpers;
using FluentValidation;

namespace CenterManagement.Core.Features.UsersFeature.Teacher.Commands.Validatiors;

public sealed class EditTeacherValidator : AbstractValidator<EditTeacherCommand>
{
    public EditTeacherValidator()
    {
        RuleFor(x => x.Email)
            .MaximumLength(254).WithMessage("البريد الإلكتروني طويل جدًا")
            .Must(UserEmailHelper.IsValidOptional).WithMessage(UserEmailHelper.InvalidMessage)
            .When(x => !string.IsNullOrWhiteSpace(x.Email));
    }
}

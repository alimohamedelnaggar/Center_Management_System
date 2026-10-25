using CenterManagement.Core.Features.Auth.Profile.Command.Models;
using FluentValidation;

namespace CenterManagement.Core.Features.Auth.Profile.Command.Validators;

public class UpdateMySubjectValidator
    : AbstractValidator<UpdateMySubjectCommand>
{
    public UpdateMySubjectValidator()
    {
        RuleFor(x => x.Subject)
            .NotEmpty().WithMessage("مادة المدرس مطلوبة")
            .MaximumLength(100).WithMessage("المادة يجب ألا تزيد عن 100 حرف");
    }
}

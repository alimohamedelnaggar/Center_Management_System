using CenterManagement.Core.Features.Centers.Commands.Models;
using FluentValidation;

namespace CenterManagement.Core.Features.Centers.Commands.Validators;

public class UpdateMyCenterCommandValidator : AbstractValidator<UpdateMyCenterCommand>
{
    public UpdateMyCenterCommandValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("اسم المركز مطلوب")
            .MaximumLength(200).WithMessage("اسم المركز يجب ألا يزيد عن 200 حرف");
    }
}

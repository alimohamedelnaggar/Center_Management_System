using CenterManagement.Core.Features.UsersFeature.Teacher.Commands.Models;
using FluentValidation;

namespace CenterManagement.Core.Features.UsersFeature.Teacher.Commands.Validatiors;

public class AddTeacherValidator : AbstractValidator<AddTeacherCommand>
{
    public AddTeacherValidator()
    {
        RuleFor(x => x.FullName)
            .NotEmpty().WithMessage("اسم المدرس مطلوب")
            .MaximumLength(150).WithMessage("الاسم يجب ألا يزيد عن 150 حرف");

        RuleFor(x => x.PhoneNumber)
            .NotEmpty().WithMessage("رقم الهاتف مطلوب")
            .Matches(@"^01[0-2,5]\d{8}$").WithMessage("رقم الهاتف غير صحيح");

        RuleFor(x => x.Password)
            .NotEmpty().WithMessage("كلمة المرور مطلوبة")
            .MinimumLength(6).WithMessage("كلمة المرور يجب ألا تقل عن 6 أحرف");

        RuleFor(x => x.ConfirmPassword)
            .Equal(x => x.Password).WithMessage("كلمة المرور غير متطابقة");

        RuleFor(x => x.Subject)
            .NotEmpty().WithMessage("مادة المدرس مطلوبة")
            .MaximumLength(100).WithMessage("المادة يجب ألا تزيد عن 100 حرف");
    }
}

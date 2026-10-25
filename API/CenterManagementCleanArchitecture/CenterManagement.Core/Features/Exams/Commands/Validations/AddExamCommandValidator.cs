using CenterManagement.Core.Features.Exams.Commands.Models;

namespace CenterManagement.Core.Features.Exams.Commands.Validators;

public class AddExamCommandValidator : AbstractValidator<AddExamCommand>
{
    public AddExamCommandValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty()
            .WithMessage("اسم الامتحان مطلوب.")
            .MaximumLength(100)
            .WithMessage("اسم الامتحان لا يجب أن يتجاوز 100 حرف.");

        RuleFor(x => x.GroupId)
            .NotEmpty()
            .WithMessage("يجب اختيار المجموعة.");
        RuleFor(x => x.SessionId)
    .NotEmpty()
    .WithMessage("يجب اختيار الحصة.");
        RuleFor(x => x.ExamDate)
            .NotEmpty()
            .WithMessage("تاريخ الامتحان مطلوب.");

        RuleFor(x => x.Components)
            .NotEmpty()
            .WithMessage("يجب إضافة نوع تقييم واحد على الأقل.");

        RuleForEach(x => x.Components)
            .SetValidator(new ExamComponentDtoValidator());

        RuleFor(x => x.Components)
            .Must(x => x.Select(c => c.Type).Distinct().Count() == x.Count)
            .WithMessage("لا يمكن تكرار نفس نوع التقييم.");

        RuleFor(x => x.Students)
            .NotEmpty()
            .WithMessage("يجب إضافة الطلاب.");

        RuleFor(x => x.Students)
            .Must(x => x.Select(s => s.StudentId).Distinct().Count() == x.Count)
            .WithMessage("تم تكرار أحد الطلاب أكثر من مرة.");

        RuleForEach(x => x.Students)
            .SetValidator(new StudentMarkDtoValidator());
    }
}

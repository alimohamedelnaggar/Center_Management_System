using CenterManagement.Core.Features.Exams.Commands.Models;

namespace CenterManagement.Core.Features.Exams.Commands.Validators;

public class StudentMarkDtoValidator : AbstractValidator<StudentMarkDto>
{
    public StudentMarkDtoValidator()
    {
        RuleFor(x => x.StudentId)
            .NotEmpty()
            .WithMessage("الطالب غير صحيح.");

        RuleFor(x => x.Marks)
            .NotEmpty()
            .WithMessage("يجب إدخال درجات الطالب.");

        RuleForEach(x => x.Marks)
            .SetValidator(new ComponentMarkDtoValidator());
    }
}

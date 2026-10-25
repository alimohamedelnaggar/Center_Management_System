using FluentValidation;
using CenterManagement.Core.Features.Exams.Commands.Models;

namespace CenterManagement.Core.Features.Exams.Commands.Validators;

public class ExamComponentDtoValidator : AbstractValidator<ExamComponentDto>
{
    public ExamComponentDtoValidator()
    {
        RuleFor(x => x.TotalMarks)
            .GreaterThan(0)
            .WithMessage("يجب أن تكون الدرجة الكلية أكبر من صفر.");
    }
}

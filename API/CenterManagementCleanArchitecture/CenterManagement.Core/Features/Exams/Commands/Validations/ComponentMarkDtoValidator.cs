using CenterManagement.Core.Features.Exams.Commands.Models;

namespace CenterManagement.Core.Features.Exams.Commands.Validators;

public class ComponentMarkDtoValidator : AbstractValidator<ComponentMarkDto>
{
    public ComponentMarkDtoValidator()
    {
        RuleFor(x => x.Mark)
            .GreaterThanOrEqualTo(0)
            .WithMessage("لا يمكن أن تكون درجة الطالب أقل من صفر.");
    }
}
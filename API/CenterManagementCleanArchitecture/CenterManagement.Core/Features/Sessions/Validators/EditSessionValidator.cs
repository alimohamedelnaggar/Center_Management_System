using FluentValidation;

namespace CenterManagement.Application.Features.Sessions.Commands.EditSession;

public sealed class EditSessionValidator : AbstractValidator<EditSessionCommand>
{
    public EditSessionValidator()
    {
        RuleFor(x => x.Id)
            .NotEmpty();

        RuleFor(x => x.GroupId)
            .NotEmpty();

        RuleFor(x => x.SessionPrice)
            .GreaterThan(0);

        RuleFor(x => x.StartTime)
            .LessThan(x => x.EndTime)
            .WithMessage("Start time must be before end time.");
    }
}
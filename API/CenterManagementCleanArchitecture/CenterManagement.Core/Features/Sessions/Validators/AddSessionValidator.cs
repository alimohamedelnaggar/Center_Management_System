using CenterManagement.Core.Features.Sessions.Commands.AddSessions;
using System;
using System.Collections.Generic;
using System.Text;

namespace CenterManagement.Core.Features.Sessions.Validators
{
    public sealed class AddSessionValidator : AbstractValidator<AddSessionCommand>
    {
        public AddSessionValidator()
        {
            RuleFor(x => x.GroupId)
                .NotEmpty();

            RuleFor(x => x.SessionPrice)
                .GreaterThan(0);

            RuleFor(x => x.StartTime)
                .LessThan(x => x.EndTime)
                .WithMessage("Start time must be before end time.");
        }
    }
}

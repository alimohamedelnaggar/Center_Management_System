using CenterManagement.Core.Features.Auth.Profile.Command.Models;
using CenterManagement.Core.Helpers;

namespace CenterManagement.Core.Features.Auth.Profile.Command.Validators;

public class RequestEmailChangeValidator : AbstractValidator<RequestEmailChangeCommand>
{
    private readonly IStringLocalizer<SharedResources> _localizer;

    public RequestEmailChangeValidator(IStringLocalizer<SharedResources> localizer)
    {
        _localizer = localizer;

        RuleFor(x => x.Email)
            .NotEmpty().WithMessage(_localizer[SharedResourcesKeys.NotEmpty])
            .NotNull().WithMessage(_localizer[SharedResourcesKeys.Required])
            .Must(UserEmailHelper.IsValidOptional)
            .WithMessage(UserEmailHelper.InvalidMessage);
    }
}

using CenterManagement.Core.Features.Shared.EmailFeature.Commands.Models;

namespace CenterManagement.Core.Features.Shared.EmailFeature.Commands.Validators;

public class SendEmailValidator : AbstractValidator<SendEmailCommand>
{
    #region Fields
    private readonly IStringLocalizer<SharedResources> _localizer;
    #endregion
    #region Constructors
    public SendEmailValidator(IStringLocalizer<SharedResources> localizer)
    {
        _localizer = localizer;
        ApplyValidationsRules();
    }
    #endregion
    #region Actions
    public void ApplyValidationsRules()
    {
        RuleFor(x => x.Email)
             .NotEmpty().WithMessage(_localizer[SharedResourcesKeys.NotEmpty])
             .NotNull().WithMessage(_localizer[SharedResourcesKeys.Required]);

        RuleFor(x => x.Message)
             .NotEmpty().WithMessage(_localizer[SharedResourcesKeys.NotEmpty])
             .NotNull().WithMessage(_localizer[SharedResourcesKeys.Required]);
    }
    #endregion
}

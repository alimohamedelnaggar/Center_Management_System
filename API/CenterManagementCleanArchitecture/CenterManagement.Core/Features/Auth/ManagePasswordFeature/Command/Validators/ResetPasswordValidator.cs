using CenterManagement.Core.Features.Auth.ManagePasswordFeature.Command.Models;

namespace CenterManagement.Core.Features.Auth.ManagePasswordFeature.Command.Validators;

public class ResetPasswordValidator : AbstractValidator<ResetPasswordCommand>
{
    #region Fields
    private readonly IStringLocalizer<SharedResources> _localizer;
    #endregion

    #region Constructors
    public ResetPasswordValidator(IStringLocalizer<SharedResources> localizer)
    {
        _localizer = localizer;
        ApplyValidationsRules();
        ApplyCustomValidationsRules();
    }
    #endregion

    #region Handle Functions
    public void ApplyValidationsRules()
    {
        RuleFor(x => x.PhoneNumber)
             .NotEmpty().WithMessage(_localizer[SharedResourcesKeys.NotEmpty])
             .NotNull().WithMessage(_localizer[SharedResourcesKeys.Required]);
        RuleFor(x => x.Code)
             .NotEmpty().WithMessage(_localizer[SharedResourcesKeys.NotEmpty])
             .NotNull().WithMessage(_localizer[SharedResourcesKeys.Required])
             .Length(6).WithMessage(_localizer[SharedResourcesKeys.InvaildCode]);
        RuleFor(x => x.Password)
             .NotEmpty().WithMessage(_localizer[SharedResourcesKeys.NotEmpty])
             .NotNull().WithMessage(_localizer[SharedResourcesKeys.Required]);
        RuleFor(x => x.ConfirmPassword)
             .Equal(x => x.Password).WithMessage(_localizer[SharedResourcesKeys.PasswordNotEqualConfirmPass]);

    }

    public void ApplyCustomValidationsRules()
    {

    }

    #endregion
}

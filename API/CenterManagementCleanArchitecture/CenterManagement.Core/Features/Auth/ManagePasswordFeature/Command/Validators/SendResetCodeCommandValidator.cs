using CenterManagement.Core.Features.Auth.ManagePasswordFeature.Command.Models;

namespace CenterManagement.Core.Features.Auth.ManagePasswordFeature.Command.Validators
{
    public class SendResetCodeCommandValidator : AbstractValidator<SendResetCodeCommand>
    {
        #region Fields
        private readonly IStringLocalizer<SharedResources> _localizer;
        #endregion

        #region Constructors
        public SendResetCodeCommandValidator(IStringLocalizer<SharedResources> localizer)
        {
            _localizer = localizer;
            ApplyValidationsRules();
        }
        #endregion

        #region Actions
        public void ApplyValidationsRules()
        {
            RuleFor(x => x.PhoneNumber)
                 .NotEmpty().WithMessage(_localizer[SharedResourcesKeys.NotEmpty])
                 .NotNull().WithMessage(_localizer[SharedResourcesKeys.Required])
                 .Matches(@"^01[0125][0-9]{8}$").WithMessage("رقم الهاتف غير صحيح");
        }
        #endregion
    }
}

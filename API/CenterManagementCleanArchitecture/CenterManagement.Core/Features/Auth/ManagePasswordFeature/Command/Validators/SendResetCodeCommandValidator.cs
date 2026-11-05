using CenterManagement.Core.Features.Auth.ManagePasswordFeature.Command.Models;
using CenterManagement.Core.Helpers;

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
            RuleFor(x => x)
                .Must(x => !string.IsNullOrWhiteSpace(x.Identifier)
                           || !string.IsNullOrWhiteSpace(x.PhoneNumber))
                .WithMessage(_localizer[SharedResourcesKeys.NotEmpty]);

            RuleFor(x => x)
                .Must(x => AccountRecoveryHelper.IsValid(
                    AccountRecoveryHelper.EffectiveIdentifier(x.Identifier, x.PhoneNumber)))
                .WithMessage("رقم الهاتف أو البريد الإلكتروني غير صحيح");
        }
        #endregion
    }
}

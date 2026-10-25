using CenterManagement.Core.Features.Shared.EncryptionProvider.Commands.Models;

namespace CenterManagement.Core.Features.Shared.EncryptionProvider.Commands.Validators;

public class EncryptionProviderValidator : AbstractValidator<EncryptionProviderCommand>
{
    #region Fields
    private readonly IStringLocalizer<SharedResources> _localizer;
    #endregion
    #region Constructors
    public EncryptionProviderValidator(IStringLocalizer<SharedResources> localizer)
    {
        _localizer = localizer;
        ApplyValidationsRules();
    }
    #endregion
    #region Actions
    public void ApplyValidationsRules()
    {
        RuleFor(x => x.Data)
             .NotEmpty().WithMessage(_localizer[SharedResourcesKeys.NotEmpty])
             .NotNull().WithMessage(_localizer[SharedResourcesKeys.Required]);
    }
    #endregion
}

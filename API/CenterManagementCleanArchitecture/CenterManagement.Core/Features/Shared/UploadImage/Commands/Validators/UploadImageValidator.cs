namespace CenterManagement.Core.Features.Shared.UploadImage.Commands.Validators;

public class UploadImageValidator : AbstractValidator<UploadImageCommand>
{
    #region Fields
    private readonly IStringLocalizer<SharedResources> _localizer;
    #endregion
    #region Constructors
    public UploadImageValidator(IStringLocalizer<SharedResources> localizer)
    {
        _localizer = localizer;
        ApplyValidationsRules();
    }
    #endregion
    #region Actions
    public void ApplyValidationsRules()
    {

    }
    #endregion
}

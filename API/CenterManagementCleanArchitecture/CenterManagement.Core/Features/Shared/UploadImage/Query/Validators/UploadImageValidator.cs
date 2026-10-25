using CenterManagement.Core.Features.Shared.UploadImage.Query.Models;

namespace CenterManagement.Core.Features.Shared.UploadImage.Query.Validators;

public class UploadImageValidator : AbstractValidator<GetImageQuery>
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

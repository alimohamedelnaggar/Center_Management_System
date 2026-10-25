
namespace CenterManagement.Core.Features.Auth.ApplicationUser.Commands.Validatiors;

public class AddUserValidator : AbstractValidator<AddUserCommand>
{
    #region Fields
    private readonly IStringLocalizer<SharedResources> _localizer;
    #endregion

    #region Constructors
    public AddUserValidator(IStringLocalizer<SharedResources> localizer)
    {
        _localizer = localizer;
        ApplyValidationsRules();
        ApplyCustomValidationsRules();
    }
    #endregion

    #region Handle Functions
    public void ApplyValidationsRules()
    {
        RuleFor(x => x.FullName)
             .NotEmpty().WithMessage(_localizer[SharedResourcesKeys.NotEmpty])
             .NotNull().WithMessage(_localizer[SharedResourcesKeys.Required])
             .MaximumLength(100).WithMessage(_localizer[SharedResourcesKeys.MaxLengthis100]);

        RuleFor(x => x.Email)
             .NotEmpty().WithMessage(_localizer[SharedResourcesKeys.NotEmpty])
              .NotNull().WithMessage(_localizer[SharedResourcesKeys.Required])
              .EmailAddress().WithMessage("Invalid email format");

        RuleFor(x => x.PhoneNumber)
           .NotEmpty().WithMessage(_localizer[SharedResourcesKeys.NotEmpty]);

        RuleFor(x => x.Password)
             .NotEmpty().WithMessage(_localizer[SharedResourcesKeys.NotEmpty])
              .NotNull().WithMessage(_localizer[SharedResourcesKeys.Required])
              .MinimumLength(6).WithMessage("Password must be at least 6 characters");

        RuleFor(x => x.ConfirmPassword)
              .NotEmpty().WithMessage(_localizer[SharedResourcesKeys.NotEmpty])
             .Equal(x => x.Password).WithMessage(_localizer[SharedResourcesKeys.PasswordNotEqualConfirmPass])
             .WithMessage("Passwords do not match");

        RuleFor(x => x.Role)
           .NotEmpty().WithMessage(_localizer[SharedResourcesKeys.NotEmpty])
           .Must(role => role != null && (role.Equals("Client", StringComparison.OrdinalIgnoreCase) || role.Equals("Lawyer", StringComparison.OrdinalIgnoreCase)))
           .WithMessage("Role must be either Client or Lawyer");

        RuleFor(x => x.AcceptTerms)
           .Equal(true).WithMessage("You must accept terms and conditions");

    }

    public void ApplyCustomValidationsRules()
    {

    }

    #endregion
}

using CenterManagement.Core.Features.Auth.Authorization.Commands.Models;

namespace CenterManagement.Core.Features.Auth.Authorization.Commands.Validators
{
    public class AddRoleValidators : AbstractValidator<AddRoleCommand>
    {
        #region Fields
        private readonly IStringLocalizer<SharedResources> _stringLocalizer;
        private readonly RoleManager<Role> _roleManager;
        #endregion

        #region Constructors

        public AddRoleValidators(IStringLocalizer<SharedResources> stringLocalizer, RoleManager<Role> roleManager)
        {
            _stringLocalizer = stringLocalizer;
            ApplyValidationsRules();
            ApplyCustomValidationsRules();
            _roleManager = roleManager;
        }
        #endregion

        #region Actions
        public void ApplyValidationsRules()
        {
            RuleFor(x => x.RoleName)
                 .NotEmpty().WithMessage(_stringLocalizer[SharedResourcesKeys.NotEmpty])
                 .NotNull().WithMessage(_stringLocalizer[SharedResourcesKeys.Required]);
        }

        public void ApplyCustomValidationsRules()
        {
            RuleFor(x => x.RoleName)
                .MustAsync(RoleNameNotExists)
                .WithMessage(_stringLocalizer[SharedResourcesKeys.IsExist]);
        }

        private async Task<bool> RoleNameNotExists(
            string roleName,
            CancellationToken cancellationToken)
        {
            return !await _roleManager.RoleExistsAsync(roleName);
        }

        #endregion
    }
}

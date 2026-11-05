using CenterManagement.Core.Features.Auth.Authentication.Query.Models;

namespace CenterManagement.Core.Features.Auth.Authentication.Query.Validators;

public class ConfirmEmailChangeValidator : AbstractValidator<ConfirmEmailChangeQuery>
{
    public ConfirmEmailChangeValidator()
    {
        RuleFor(x => x.UserId).NotEmpty();
        RuleFor(x => x.Email).NotEmpty().EmailAddress();
        RuleFor(x => x.Token).NotEmpty();
    }
}

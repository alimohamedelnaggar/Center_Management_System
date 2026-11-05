using System.ComponentModel.DataAnnotations;
using CenterManagement.Data.Entities.Identity;
using Microsoft.AspNetCore.Identity;

namespace CenterManagement.Infrustructure.Identity;

/// <summary>
/// Identity's built-in validator rejects a blank email once
/// <c>RequireUniqueEmail</c> is enabled: .NET 10 normalizes a missing address to
/// an empty string before validation, so "no email" is reported as
/// "Email '' is invalid.".
///
/// Email is optional on this platform (students, parents and staff without a
/// recovery address all have none), so this validator keeps the uniqueness
/// rule for real addresses and simply skips accounts that have no address.
/// </summary>
public sealed class OptionalEmailUserValidator : UserValidator<User>
{
    public OptionalEmailUserValidator(IdentityErrorDescriber? errors = null)
        : base(errors)
    {
    }

    public override async Task<IdentityResult> ValidateAsync(
        UserManager<User> manager,
        User user)
    {
        ArgumentNullException.ThrowIfNull(manager);
        ArgumentNullException.ThrowIfNull(user);

        var errors = new List<IdentityError>();
        var userName = await manager.GetUserNameAsync(user);
        var currentUserId = await manager.GetUserIdAsync(user);

        if (string.IsNullOrWhiteSpace(userName))
        {
            errors.Add(Describer.InvalidUserName(userName ?? string.Empty));
        }
        else if (!string.IsNullOrEmpty(manager.Options.User.AllowedUserNameCharacters)
                 && userName.Any(character =>
                     !manager.Options.User.AllowedUserNameCharacters.Contains(character)))
        {
            errors.Add(Describer.InvalidUserName(userName));
        }
        else
        {
            var userNameOwner = await manager.FindByNameAsync(userName);

            if (userNameOwner is not null
                && !string.Equals(
                    await manager.GetUserIdAsync(userNameOwner),
                    currentUserId,
                    StringComparison.Ordinal))
            {
                errors.Add(Describer.DuplicateUserName(userName));
            }
        }

        // Identity normalizes a missing address to an empty string, so treat
        // blank the same as null and leave the uniqueness rule untouched for
        // real addresses.
        var email = await manager.GetEmailAsync(user);

        if (!string.IsNullOrWhiteSpace(email))
        {
            if (!new EmailAddressAttribute().IsValid(email))
            {
                errors.Add(Describer.InvalidEmail(email));
            }
            else
            {
                var emailOwner = await manager.FindByEmailAsync(email);

                if (emailOwner is not null
                    && !string.Equals(
                        await manager.GetUserIdAsync(emailOwner),
                        currentUserId,
                        StringComparison.Ordinal))
                {
                    errors.Add(Describer.DuplicateEmail(email));
                }
            }
        }

        return errors.Count == 0
            ? IdentityResult.Success
            : IdentityResult.Failed(errors.ToArray());
    }
}

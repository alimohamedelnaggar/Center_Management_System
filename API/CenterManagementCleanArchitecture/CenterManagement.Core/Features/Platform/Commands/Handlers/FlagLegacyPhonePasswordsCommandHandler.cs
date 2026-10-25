using CenterManagement.Core.Features.Platform.Commands.Models;
using CenterManagement.Data.Entities.Identity;
using Microsoft.AspNetCore.Identity;

namespace CenterManagement.Core.Features.Platform.Commands.Handlers;

public class FlagLegacyPhonePasswordsCommandHandler
    : ResponseHandler,
      IRequestHandler<FlagLegacyPhonePasswordsCommand, Response<FlagLegacyPhonePasswordsResult>>
{
    private readonly UserManager<User> _userManager;

    public FlagLegacyPhonePasswordsCommandHandler(
        UserManager<User> userManager,
        IStringLocalizer<SharedResources> localizer)
        : base(localizer)
    {
        _userManager = userManager;
    }

    public async Task<Response<FlagLegacyPhonePasswordsResult>> Handle(
        FlagLegacyPhonePasswordsCommand request,
        CancellationToken cancellationToken)
    {
        var result = new FlagLegacyPhonePasswordsResult();

        var users = await _userManager.Users
            .Where(u => u.PhoneNumber != null && u.PhoneNumber != string.Empty)
            .ToListAsync(cancellationToken);

        foreach (var user in users)
        {
            cancellationToken.ThrowIfCancellationRequested();

            var isTarget =
                await _userManager.IsInRoleAsync(user, AppRoles.Student) ||
                await _userManager.IsInRoleAsync(user, AppRoles.Parent);

            if (!isTarget)
            {
                result.Skipped++;
                continue;
            }

            result.Scanned++;

            if (user.MustChangePassword)
            {
                result.AlreadyFlagged++;
                continue;
            }

            var phone = user.PhoneNumber?.Trim();

            if (string.IsNullOrWhiteSpace(phone))
            {
                result.Skipped++;
                continue;
            }

            // Only accounts still using the phone as password are affected; a
            // parent/student who already changed it is never touched.
            if (!await _userManager.CheckPasswordAsync(user, phone))
            {
                result.PasswordChanged++;
                continue;
            }

            user.MustChangePassword = true;

            var update = await _userManager.UpdateAsync(user);

            if (update.Succeeded)
            {
                result.Flagged++;
            }
            else
            {
                result.Skipped++;
            }
        }

        var message =
            $"تم فحص {result.Scanned} حساب: تفعيل التغيير الإجباري على {result.Flagged}، " +
            $"كان مفعّلًا على {result.AlreadyFlagged}، وغيّر كلمة المرور {result.PasswordChanged}";

        return Success(result, message);
    }
}

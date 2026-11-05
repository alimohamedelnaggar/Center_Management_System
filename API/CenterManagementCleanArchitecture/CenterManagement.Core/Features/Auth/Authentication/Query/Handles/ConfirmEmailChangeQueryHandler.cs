using CenterManagement.Core.Bases;
using CenterManagement.Core.Features.Auth.Authentication.Query.Models;
using CenterManagement.Core.Helpers;
using CenterManagement.Data.Entities.Identity;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Localization;

namespace CenterManagement.Core.Features.Auth.Authentication.Query.Handles;

/// <summary>
/// Completes a self-service email change. Only the address currently staged in
/// <see cref="User.PendingEmail"/> can be confirmed, and the Identity token must
/// match that address. A wrong, stale or replayed link gets the same generic
/// failure and changes nothing.
/// </summary>
public class ConfirmEmailChangeQueryHandler
    : ResponseHandler,
      IRequestHandler<ConfirmEmailChangeQuery, Response<string>>
{
    private const string InvalidLink =
        "رابط تأكيد البريد غير صالح أو منتهي الصلاحية.";

    private readonly UserManager<User> _userManager;

    public ConfirmEmailChangeQueryHandler(
        UserManager<User> userManager,
        IStringLocalizer<SharedResources> localizer) : base(localizer)
    {
        _userManager = userManager;
    }

    public async Task<Response<string>> Handle(
        ConfirmEmailChangeQuery request,
        CancellationToken cancellationToken)
    {
        if (!Guid.TryParse(request.UserId, out var userId))
            return BadRequest<string>(InvalidLink);

        var user = await _userManager.FindByIdAsync(userId.ToString());

        if (user is null || string.IsNullOrWhiteSpace(user.PendingEmail))
            return BadRequest<string>(InvalidLink);

        var requested = UserEmailHelper.Normalize(request.Email);

        if (requested is null ||
            !string.Equals(user.PendingEmail, requested, StringComparison.OrdinalIgnoreCase))
        {
            return BadRequest<string>(InvalidLink);
        }

        var result = await _userManager.ChangeEmailAsync(user, requested, request.Token);

        if (!result.Succeeded)
        {
            // Identity reports duplicate/invalid-token details that name other
            // accounts; keep the public answer generic.
            return BadRequest<string>(InvalidLink);
        }

        // Opening the link proves ownership, so the new address is confirmed
        // immediately and the staged value is retired.
        user.EmailConfirmed = true;
        user.PendingEmail = null;
        user.PendingEmailRequestedAt = null;

        await _userManager.UpdateAsync(user);

        return Success<string>("تم تأكيد بريدك الإلكتروني بنجاح.");
    }
}

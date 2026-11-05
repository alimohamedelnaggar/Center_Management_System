using CenterManagement.Core.Bases;
using CenterManagement.Core.Features.Auth.Profile.Command.Models;
using CenterManagement.Core.Features.Impersonation.Commands.Models;
using CenterManagement.Core.Features.Shared.EmailFeature.Commands.Models;
using CenterManagement.Core.Helpers;
using CenterManagement.Data.AppMetaData;
using CenterManagement.Data.Entities.Identity;
using CenterManagement.Infrustructure.Data;
using MediatR;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Localization;
using System.Security.Claims;

namespace CenterManagement.Core.Features.Auth.Profile.Command.Handlers;

/// <summary>
/// Self-service email change. The new address is only staged; the old address
/// keeps working (including for password recovery) until the tokenized link
/// sent to the new address is opened.
/// </summary>
public class RequestEmailChangeCommandHandler
    : ResponseHandler,
      IRequestHandler<RequestEmailChangeCommand, Response<string>>
{
    private readonly UserManager<User> _userManager;
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly IMediator _mediator;
    private readonly IConfiguration _configuration;

    public RequestEmailChangeCommandHandler(
        UserManager<User> userManager,
        IHttpContextAccessor httpContextAccessor,
        IMediator mediator,
        IConfiguration configuration,
        IStringLocalizer<SharedResources> localizer)
        : base(localizer)
    {
        _userManager = userManager;
        _httpContextAccessor = httpContextAccessor;
        _mediator = mediator;
        _configuration = configuration;
    }

    public async Task<Response<string>> Handle(
        RequestEmailChangeCommand request,
        CancellationToken cancellationToken)
    {
        var userId = _httpContextAccessor.HttpContext?
            .User
            .FindFirstValue(ClaimTypes.NameIdentifier);

        if (string.IsNullOrEmpty(userId))
            return Unauthorized<string>();

        var impersonating = string.Equals(
            _httpContextAccessor.HttpContext?.User
                .FindFirst(ImpersonationClaims.IsImpersonation)?.Value,
            ImpersonationClaims.TrueValue,
            StringComparison.OrdinalIgnoreCase);

        if (impersonating)
            return Forbidden<string>("لا يمكن تعديل البريد الإلكتروني أثناء انتحال الهوية");

        var user = await _userManager.FindByIdAsync(userId);

        if (user == null)
            return NotFound<string>();

        var roles = await _userManager.GetRolesAsync(user);

        if (!AccountRecoveryHelper.CanRecover(roles))
            return Forbidden<string>("لا يمكن تعديل البريد الإلكتروني لهذا الحساب");

        var normalized = UserEmailHelper.Normalize(request.Email);

        if (normalized is null || !UserEmailHelper.IsValidOptional(normalized))
            return BadRequest<string>(UserEmailHelper.InvalidMessage);

        if (string.Equals(user.Email, normalized, StringComparison.OrdinalIgnoreCase))
            return BadRequest<string>("البريد الإلكتروني الجديد مطابق للبريد الحالي.");

        var normalizedUpper = normalized.ToUpperInvariant();

        var duplicate = await _userManager.Users
            .AnyAsync(u => u.NormalizedEmail == normalizedUpper && u.Id != user.Id,
                cancellationToken);

        if (duplicate)
            return BadRequest<string>(UserEmailHelper.DuplicateMessage);

        user.PendingEmail = normalized;
        user.PendingEmailRequestedAt = DateTime.UtcNow;

        var update = await _userManager.UpdateAsync(user);

        if (!update.Succeeded)
        {
            if (UserEmailHelper.IsDuplicateEmail(update))
                return BadRequest<string>(UserEmailHelper.DuplicateMessage);

            return BadRequest<string>(
                string.Join(Environment.NewLine, update.Errors.Select(e => e.Description)));
        }

        var token = await _userManager.GenerateChangeEmailTokenAsync(user, normalized);
        var baseUrl = (_configuration["App:BaseUrl"] ?? "https://localhost:5001").TrimEnd('/');

        var link =
            $"{baseUrl}/{Routing.Authentication.ConfirmEmailChange}" +
            $"?userId={user.Id}" +
            $"&email={Uri.EscapeDataString(normalized)}" +
            $"&token={Uri.EscapeDataString(token)}";

        var message =
            "<p>طلبت تغيير البريد الإلكتروني لحسابك.</p>" +
            $"<p><a href=\"{link}\">تأكيد البريد الإلكتروني الجديد</a></p>" +
            "<p>سيبقى بريدك الحالي فعالاً حتى تأكيد هذا البريد. إذا لم تطلب هذا التغيير، تجاهل الرسالة.</p>";

        var send = await _mediator.Send(new SendEmailCommand
        {
            Email = normalized,
            Message = message,
            Subject = "Confirm New Email"
        }, cancellationToken);

        if (!send.Succeeded)
            return BadRequest<string>("تعذر إرسال رسالة تأكيد البريد. حاول مرة أخرى.");

        return Success<string>(
            "أرسلنا رابط تأكيد إلى بريدك الجديد. سيبقى بريدك الحالي فعالاً حتى تأكيد البريد الجديد.");
    }
}

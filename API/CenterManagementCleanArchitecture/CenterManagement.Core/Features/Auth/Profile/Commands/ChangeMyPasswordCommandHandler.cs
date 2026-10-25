using CenterManagement.Core.Bases;
using CenterManagement.Core.Features.Auth.Profile.Command.Models;
using CenterManagement.Core.Features.Impersonation.Commands.Models;
using CenterManagement.Data.Entities.Identity;
using CenterManagement.Data.Results;
using CenterManagement.Infrustructure.InfrastructureBases.Bases;
using MediatR;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Localization;
using System.Security.Claims;

namespace CenterManagement.Core.Features.Auth.Profile.Command.Handlers;

public class ChangeMyPasswordCommandHandler
    : ResponseHandler,
      IRequestHandler<ChangeMyPasswordCommand, Response<JwtAuthResult>>
{
    private const int MinimumPasswordLength = 8;

    private readonly UserManager<User> _userManager;
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly IRepositoryManager _repositoryManager;
    private readonly IMediator _mediator;

    public ChangeMyPasswordCommandHandler(
        UserManager<User> userManager,
        IHttpContextAccessor httpContextAccessor,
        IRepositoryManager repositoryManager,
        IMediator mediator,
        IStringLocalizer<SharedResources> localizer)
        : base(localizer)
    {
        _userManager = userManager;
        _httpContextAccessor = httpContextAccessor;
        _repositoryManager = repositoryManager;
        _mediator = mediator;
    }

    public async Task<Response<JwtAuthResult>> Handle(
        ChangeMyPasswordCommand request,
        CancellationToken cancellationToken)
    {
        var userId = _httpContextAccessor.HttpContext?
            .User
            .FindFirstValue(ClaimTypes.NameIdentifier);

        if (string.IsNullOrEmpty(userId))
            return Unauthorized<JwtAuthResult>();

        // Never allow credential changes while an operator is impersonating.
        var impersonating = string.Equals(
            _httpContextAccessor.HttpContext?.User
                .FindFirst(ImpersonationClaims.IsImpersonation)?.Value,
            ImpersonationClaims.TrueValue,
            StringComparison.OrdinalIgnoreCase);

        if (impersonating)
            return Forbidden<JwtAuthResult>("لا يمكن تغيير كلمة المرور أثناء انتحال الهوية");

        var user = await _userManager.FindByIdAsync(userId);

        if (user == null)
            return NotFound<JwtAuthResult>();

        var newPassword = request.NewPassword ?? string.Empty;
        var phone = user.PhoneNumber?.Trim();

        if (newPassword.Length < MinimumPasswordLength)
            return BadRequest<JwtAuthResult>(
                $"كلمة المرور الجديدة يجب ألا تقل عن {MinimumPasswordLength} أحرف");

        // The temporary credential (phone number) can never be kept as the
        // permanent password, and the new password must be different.
        if (!string.IsNullOrWhiteSpace(phone) &&
            string.Equals(newPassword.Trim(), phone, StringComparison.Ordinal))
        {
            return BadRequest<JwtAuthResult>(
                "لا يمكن استخدام رقم الهاتف ككلمة مرور جديدة، اختر كلمة مرور مختلفة");
        }

        if (string.Equals(newPassword, request.CurrentPassword, StringComparison.Ordinal))
            return BadRequest<JwtAuthResult>("كلمة المرور الجديدة يجب أن تختلف عن الحالية");

        var result = await _userManager.ChangePasswordAsync(
            user,
            request.CurrentPassword,
            newPassword);

        if (!result.Succeeded)
        {
            var error = result.Errors.FirstOrDefault()?.Description
                        ?? "Failed to change password.";

            return BadRequest<JwtAuthResult>(error);
        }

        // Clear the forced-change flag before minting the replacement tokens so
        // the new access token no longer carries `pwd_change_required`.
        if (user.MustChangePassword)
        {
            user.MustChangePassword = false;
            await _userManager.UpdateAsync(user);
        }

        // Every session that used the temporary password is no longer valid.
        var activeTokens = await _repositoryManager.RefreshTokenRepository
            .GetTableTracking()
            .Where(t => t.UserId == user.Id && !t.IsRevoked)
            .ToListAsync(cancellationToken);

        if (activeTokens.Count > 0)
        {
            var now = DateTime.UtcNow;

            foreach (var refreshToken in activeTokens)
            {
                refreshToken.IsRevoked = true;
                refreshToken.RevokedAt = now;
            }

            await _repositoryManager.SaveChangesAsync();
        }

        var tokens = await _mediator.Send(
            new GenerateRefreshTokenCommand { User = user },
            cancellationToken);

        if (!tokens.Succeeded || tokens.Data is null)
            return BadRequest<JwtAuthResult>("تم تغيير كلمة المرور، سجّل الدخول من جديد");

        return Success(tokens.Data, "تم تغيير كلمة المرور بنجاح");
    }
}

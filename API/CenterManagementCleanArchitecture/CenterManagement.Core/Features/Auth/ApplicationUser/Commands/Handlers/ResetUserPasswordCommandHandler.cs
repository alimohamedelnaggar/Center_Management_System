using CenterManagement.Core.Bases;
using CenterManagement.Core.Features.Auth.ApplicationUser.Commands.Models;
using CenterManagement.Core.Features.Impersonation.Commands.Models;
using CenterManagement.Data.AppMetaData;
using CenterManagement.Data.Entities.Abstractions;
using CenterManagement.Data.Entities.Identity;
using CenterManagement.Data.Helpers;
using CenterManagement.Infrustructure.InfrastructureBases.Bases;
using MediatR;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Localization;

namespace CenterManagement.Core.Features.Auth.ApplicationUser.Commands.Handlers;

/// <summary>
/// SuperAdmin resets a user's password to a generated temporary one and forces
/// a change on next sign-in. Refused while impersonating.
/// </summary>
public class ResetUserPasswordCommandHandler
    : ResponseHandler,
      IRequestHandler<ResetUserPasswordCommand, Response<ResetUserPasswordResult>>
{
    private readonly UserManager<User> _userManager;
    private readonly IRepositoryManager _repositoryManager;
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly IAuditLogService _auditLog;

    public ResetUserPasswordCommandHandler(
        UserManager<User> userManager,
        IRepositoryManager repositoryManager,
        IHttpContextAccessor httpContextAccessor,
        IAuditLogService auditLog,
        IStringLocalizer<SharedResources> localizer) : base(localizer)
    {
        _userManager = userManager;
        _repositoryManager = repositoryManager;
        _httpContextAccessor = httpContextAccessor;
        _auditLog = auditLog;
    }

    public async Task<Response<ResetUserPasswordResult>> Handle(
        ResetUserPasswordCommand request,
        CancellationToken cancellationToken)
    {
        if (IsImpersonating())
            return Forbidden<ResetUserPasswordResult>("لا يمكن إعادة تعيين كلمة المرور أثناء انتحال الهوية");

        var user = await _userManager.FindByIdAsync(request.UserId.ToString());

        if (user is null)
            return NotFound<ResetUserPasswordResult>("المستخدم غير موجود");

        if (await _userManager.IsInRoleAsync(user, AppRoles.SuperAdmin))
            return BadRequest<ResetUserPasswordResult>("لا يمكن إعادة تعيين كلمة مرور حساب مدير المنصة");

        // Students and parents always return to the phone-number credential
        // (username = password = phone), then must replace it at sign-in.
        var temporaryPassword = await ResolveTemporaryPasswordAsync(user);

        if (string.IsNullOrWhiteSpace(temporaryPassword))
            return BadRequest<ResetUserPasswordResult>(
                "لا يوجد رقم هاتف صالح لإعادة تعيين كلمة مرور هذا الحساب");

        var token = await _userManager.GeneratePasswordResetTokenAsync(user);
        var resetResult = await _userManager.ResetPasswordAsync(user, token, temporaryPassword);

        if (!resetResult.Succeeded)
        {
            return BadRequest<ResetUserPasswordResult>(
                string.Join(Environment.NewLine,
                    resetResult.Errors.Select(e => e.Description)));
        }

        user.MustChangePassword = true;
        await _userManager.UpdateAsync(user);

        // Invalidate every outstanding refresh token so old sessions can no
        // longer mint new access tokens after the password reset.
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

        await _auditLog.WriteAsync(
            action: "ResetUserPassword",
            entityType: "User",
            entityId: user.Id.ToString(),
            details: $"Reset password for {user.FullName} ({user.PhoneNumber})",
            cancellationToken: cancellationToken);

        return Success(new ResetUserPasswordResult
        {
            UserId = user.Id,
            PhoneNumber = user.PhoneNumber,
            TemporaryPassword = temporaryPassword,
            MustChangePassword = true
        }, "تم إعادة تعيين كلمة المرور وسيُطلب تغييرها عند الدخول");
    }

    private async Task<string?> ResolveTemporaryPasswordAsync(User user)
    {
        var isPhoneCredentialRole =
            await _userManager.IsInRoleAsync(user, AppRoles.Student) ||
            await _userManager.IsInRoleAsync(user, AppRoles.Parent);

        return isPhoneCredentialRole
            ? user.PhoneNumber?.Trim()
            : TemporaryPasswordGenerator.Generate();
    }

    private bool IsImpersonating() =>
        string.Equals(
            _httpContextAccessor.HttpContext?.User
                .FindFirst(ImpersonationClaims.IsImpersonation)?.Value,
            ImpersonationClaims.TrueValue,
            StringComparison.OrdinalIgnoreCase);
}

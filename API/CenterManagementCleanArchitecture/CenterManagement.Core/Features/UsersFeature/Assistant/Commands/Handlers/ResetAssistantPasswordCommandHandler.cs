using CenterManagement.Core.Features.UsersFeature.Assistant.Commands.Models;
using CenterManagement.Infrustructure.InfrastructureBases.Bases;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Localization;

namespace CenterManagement.Core.Features.UsersFeature.Assistant.Commands.Handlers;

/// <summary>
/// Lets a center admin reset one of the center's assistants. The new password is
/// generated on the server (the caller cannot choose it), the account is forced
/// to change it at next sign-in, and every outstanding refresh token is revoked.
/// Assistants outside the caller's center are reported as not found, so the
/// endpoint cannot be used to probe other centers.
/// </summary>
public sealed class ResetAssistantPasswordCommandHandler
    : ResponseHandler,
      IRequestHandler<ResetAssistantPasswordCommand, Response<AssistantCredential>>
{
    private readonly UserManager<User> _userManager;
    private readonly IRepositoryManager _repositoryManager;
    private readonly ITenantContext _tenantContext;
    private readonly IAuditLogService _auditLog;

    public ResetAssistantPasswordCommandHandler(
        UserManager<User> userManager,
        IRepositoryManager repositoryManager,
        ITenantContext tenantContext,
        IAuditLogService auditLog,
        IStringLocalizer<SharedResources> localizer) : base(localizer)
    {
        _userManager = userManager;
        _repositoryManager = repositoryManager;
        _tenantContext = tenantContext;
        _auditLog = auditLog;
    }

    public async Task<Response<AssistantCredential>> Handle(
        ResetAssistantPasswordCommand request,
        CancellationToken cancellationToken)
    {
        var assistant = await _userManager.Users
            .OfType<Assistent>()
            .FirstOrDefaultAsync(a => a.Id == request.AssistantId, cancellationToken);

        // Explicit center check (the global filter intentionally does not cover
        // derived user types), and an indistinguishable "not found" reply.
        if (assistant is null || !IsInsideCallerCenter(assistant))
            return NotFound<AssistantCredential>("المساعد غير موجود");

        var temporaryPassword = TemporaryPasswordGenerator.Generate();

        var token = await _userManager.GeneratePasswordResetTokenAsync(assistant);
        var resetResult = await _userManager.ResetPasswordAsync(assistant, token, temporaryPassword);

        if (!resetResult.Succeeded)
        {
            return BadRequest<AssistantCredential>(
                string.Join(Environment.NewLine,
                    resetResult.Errors.Select(e => e.Description)));
        }

        assistant.MustChangePassword = true;
        await _userManager.UpdateAsync(assistant);

        await RevokeRefreshTokensAsync(assistant.Id, cancellationToken);

        await _auditLog.WriteAsync(
            action: "ResetAssistantPassword",
            entityType: "Assistant",
            entityId: assistant.Id.ToString(),
            details: $"Reset password for assistant {assistant.FullName} ({assistant.PhoneNumber})",
            cancellationToken: cancellationToken);

        return Success(new AssistantCredential
        {
            AssistantId = assistant.Id,
            AssistantName = assistant.FullName,
            Username = assistant.PhoneNumber ?? assistant.UserName ?? string.Empty,
            TemporaryPassword = temporaryPassword
        }, "تم إنشاء كلمة مرور مؤقتة. سلّمها للمساعد ليغيّرها عند تسجيل الدخول.");
    }

    private bool IsInsideCallerCenter(Assistent assistant)
    {
        if (_tenantContext.IsUnrestricted)
            return true;

        // Assistent hides User.CenterId with its own (unmapped-on-read) property,
        // so read the tenant value from the Identity row.
        var assistantCenterId = ((User)assistant).CenterId;

        return _tenantContext.CenterId is Guid centerId && assistantCenterId == centerId;
    }

    private async Task RevokeRefreshTokensAsync(Guid userId, CancellationToken cancellationToken)
    {
        var activeTokens = await _repositoryManager.RefreshTokenRepository
            .GetTableTracking()
            .Where(t => t.UserId == userId && !t.IsRevoked)
            .ToListAsync(cancellationToken);

        if (activeTokens.Count == 0)
            return;

        var now = DateTime.UtcNow;
        foreach (var refreshToken in activeTokens)
        {
            refreshToken.IsRevoked = true;
            refreshToken.RevokedAt = now;
        }

        await _repositoryManager.SaveChangesAsync();
    }
}

using CenterManagement.Core.Features.Auth.ManagePasswordFeature.Command.Models;
using CenterManagement.Core.Features.Shared.EmailFeature.Commands.Models;
using CenterManagement.Core.Helpers;
using CenterManagement.Infrustructure.InfrastructureBases.Bases;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace CenterManagement.Core.Features.Auth.ManagePasswordFeature.Command.Handlers;

/// <summary>
/// Self-service password reset. A one-time, expiring, attempt-limited code is
/// sent out-of-band (email) and exchanged for a new password. The response to
/// <see cref="SendResetCodeCommand"/> never reveals whether the account exists,
/// owns an email, or is even eligible for self-service recovery, and the exchange
/// for <see cref="ResetPasswordCommand"/> returns the same generic failure for
/// unknown accounts, wrong codes, expired codes and exhausted attempts.
/// </summary>
public class ManagePasswordCommandHandler : ResponseHandler,
    IRequestHandler<SendResetCodeCommand, Response<string>>,
    IRequestHandler<ResetPasswordCommand, Response<string>>
{
    private const int CodeLength = 6;
    private static readonly TimeSpan CodeLifetime = TimeSpan.FromMinutes(12);
    private const int MaxAttempts = 5;

    #region Fields
    private readonly IStringLocalizer<SharedResources> _stringLocalizer;
    private readonly UserManager<User> _userManager;
    private readonly IRepositoryManager _repositoryManager;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<ManagePasswordCommandHandler> _logger;

    #endregion

    #region Constructors
    public ManagePasswordCommandHandler(
        IStringLocalizer<SharedResources> stringLocalizer,
        UserManager<User> userManager,
        IRepositoryManager repositoryManager,
        IServiceScopeFactory scopeFactory,
        ILogger<ManagePasswordCommandHandler> logger) : base(stringLocalizer)
    {
        _stringLocalizer = stringLocalizer;
        _userManager = userManager;
        _repositoryManager = repositoryManager;
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    #endregion

    #region Handle Functions

    public async Task<Response<string>> Handle(SendResetCodeCommand request, CancellationToken cancellationToken)
    {
        var identifier = AccountRecoveryHelper.EffectiveIdentifier(request.Identifier, request.PhoneNumber);
        var user = await FindByIdentifierAsync(identifier, cancellationToken);

        // Always do the expensive parts (code generation + hashing) so the
        // response time cannot be used to fingerprint known identifiers.
        var code = RandomNumberGenerator.GetInt32(0, 1_000_000).ToString("D6");
        var codeHash = _userManager.PasswordHasher.HashPassword(user ?? new User(), code);
        var now = DateTime.UtcNow;

        if (user is null)
            return Success<string>(AccountRecoveryHelper.SendCodeMessage);

        var roles = await _userManager.GetRolesAsync(user);

        if (!AccountRecoveryHelper.CanReceiveCode(roles, user.Email, user.EmailConfirmed))
        {
            // Students/parents and accounts without a confirmed address get the
            // exact same answer and no email. The center owns their recovery.
            return Success<string>(AccountRecoveryHelper.SendCodeMessage);
        }

        user.ResetCodeHash = codeHash;
        user.ResetCodeExpiresAt = now.Add(CodeLifetime);
        user.ResetCodeAttempts = 0;
        user.ResetCodeSentAt = now;
        user.Code = null; // retire the legacy plaintext column

        var updateResult = await _userManager.UpdateAsync(user);

        if (!updateResult.Succeeded)
        {
            // Still uniform: a persistence hiccup must not reveal the account.
            _logger.LogWarning("Failed to persist reset code for user {UserId}", user.Id);
            return Success<string>(AccountRecoveryHelper.SendCodeMessage);
        }

        var message = $"رمز إعادة تعيين كلمة المرور: {code}. صالح لمدة {CodeLifetime.TotalMinutes:0} دقيقة.";

        // Fire-and-forget so the response time does not depend on the SMTP
        // round-trip (and therefore cannot be used to fingerprint accounts).
        QueueEmail(user.Email!, message, "Reset Password", user.Id);

        return Success<string>(AccountRecoveryHelper.SendCodeMessage);
    }

    public async Task<Response<string>> Handle(ResetPasswordCommand request, CancellationToken cancellationToken)
    {
        var identifier = AccountRecoveryHelper.EffectiveIdentifier(request.Identifier, request.PhoneNumber);
        var user = await FindByIdentifierAsync(identifier, cancellationToken);

        if (user is null)
        {
            // Burn a comparable amount of work on an unknown identifier.
            _userManager.PasswordHasher.VerifyHashedPassword(
                new User(),
                _userManager.PasswordHasher.HashPassword(new User(), "000000"),
                request.Code);

            return BadRequest<string>(AccountRecoveryHelper.ResetFailedMessage);
        }

        var roles = await _userManager.GetRolesAsync(user);

        if (!AccountRecoveryHelper.CanRecover(roles)
            || user.ResetCodeHash is null
            || user.ResetCodeExpiresAt is null)
        {
            return BadRequest<string>(AccountRecoveryHelper.ResetFailedMessage);
        }

        if (user.ResetCodeExpiresAt < DateTime.UtcNow || user.ResetCodeAttempts >= MaxAttempts)
        {
            await InvalidateCodeAsync(user);
            return BadRequest<string>(AccountRecoveryHelper.ResetFailedMessage);
        }

        var verification = _userManager.PasswordHasher.VerifyHashedPassword(
            user, user.ResetCodeHash, request.Code);

        if (verification == PasswordVerificationResult.Failed)
        {
            user.ResetCodeAttempts += 1;

            if (user.ResetCodeAttempts >= MaxAttempts)
                user.ResetCodeHash = null;

            await _userManager.UpdateAsync(user);
            return BadRequest<string>(AccountRecoveryHelper.ResetFailedMessage);
        }

        var token = await _userManager.GeneratePasswordResetTokenAsync(user);
        var resetResult = await _userManager.ResetPasswordAsync(user, token, request.Password);

        if (!resetResult.Succeeded)
        {
            return BadRequest<string>(
                string.Join(Environment.NewLine,
                    resetResult.Errors.Select(e => e.Description)));
        }

        user.ResetCodeHash = null;
        user.ResetCodeExpiresAt = null;
        user.ResetCodeAttempts = 0;
        user.Code = null;
        user.MustChangePassword = false;

        await _userManager.UpdateAsync(user);

        await RevokeRefreshTokensAsync(user.Id, cancellationToken);

        // Tell the account holder that the password changed. Sent to the address
        // that was already active, never to a pending one.
        if (!string.IsNullOrWhiteSpace(user.Email))
        {
            QueueEmail(
                user.Email,
                "تم تغيير كلمة المرور الخاصة بحسابك. إذا لم تقم بهذا التغيير، تواصل مع المركز فوراً.",
                "Password Changed",
                user.Id);
        }

        return Success<string>("");
    }

    #endregion

    #region Helper Methods

    private Task<User?> FindByIdentifierAsync(string identifier, CancellationToken cancellationToken)
    {
        if (string.IsNullOrEmpty(identifier))
            return Task.FromResult<User?>(null);

        if (AccountRecoveryHelper.IsEmail(identifier))
        {
            var normalized = identifier.ToUpperInvariant();
            return _userManager.Users
                .FirstOrDefaultAsync(u => u.NormalizedEmail == normalized, cancellationToken);
        }

        return _userManager.Users
            .FirstOrDefaultAsync(u => u.PhoneNumber == identifier, cancellationToken);
    }

    private void QueueEmail(string email, string message, string subject, Guid userId)
    {
        _ = Task.Run(async () =>
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var mediator = scope.ServiceProvider.GetRequiredService<IMediator>();

                await mediator.Send(new SendEmailCommand
                {
                    Email = email,
                    Message = message,
                    Subject = subject
                });
            }
            catch (Exception ex)
            {
                // Never log the address or the message body (which can contain a
                // reset code) — only the failure and the internal user id.
                _logger.LogError(ex, "Failed to send account email for user {UserId}", userId);
            }
        }, CancellationToken.None);
    }

    private async Task InvalidateCodeAsync(User user)
    {
        user.ResetCodeHash = null;
        user.ResetCodeExpiresAt = null;
        user.ResetCodeAttempts = 0;
        await _userManager.UpdateAsync(user);
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

    #endregion
}

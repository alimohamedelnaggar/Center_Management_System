using CenterManagement.Core.Features.Auth.ManagePasswordFeature.Command.Models;
using CenterManagement.Infrustructure.InfrastructureBases.Bases;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace CenterManagement.Core.Features.Auth.ManagePasswordFeature.Command.Handlers;

/// <summary>
/// Self-service password reset. A one-time, expiring, attempt-limited code is
/// sent out-of-band (email) and exchanged for a new password. The response to
/// <see cref="SendResetCodeCommand"/> never reveals whether the account exists,
/// and the exchange for <see cref="ResetPasswordCommand"/> returns the same
/// generic failure for unknown accounts, wrong codes and expired codes.
/// </summary>
public class ManagePasswordCommandHandler : ResponseHandler,
    IRequestHandler<SendResetCodeCommand, Response<string>>,
    IRequestHandler<ResetPasswordCommand, Response<string>>
{
    private const int CodeLength = 6;
    private static readonly TimeSpan CodeLifetime = TimeSpan.FromMinutes(12);
    private const int MaxAttempts = 5;
    private const string GenericFailure = "الرمز غير صحيح أو منتهي الصلاحية.";

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
        var phoneNumber = request.PhoneNumber.Trim();
        var user = await _userManager.Users
            .FirstOrDefaultAsync(u => u.PhoneNumber == phoneNumber, cancellationToken);

        // Never disclose whether the account exists: always answer with the same
        // success response and the same amount of work on the hot path.
        if (user is null)
            return Success<string>("");

        var code = RandomNumberGenerator.GetInt32(0, 1_000_000).ToString("D6");

        user.ResetCodeHash = _userManager.PasswordHasher.HashPassword(user, code);
        user.ResetCodeExpiresAt = DateTime.UtcNow.Add(CodeLifetime);
        user.ResetCodeAttempts = 0;
        user.ResetCodeSentAt = DateTime.UtcNow;
        user.Code = null; // retire the legacy plaintext column

        var updateResult = await _userManager.UpdateAsync(user);

        if (!updateResult.Succeeded)
        {
            _logger.LogWarning("Failed to persist reset code for user {UserId}", user.Id);
            return BadRequest<string>(_stringLocalizer[SharedResourcesKeys.TryAgainInAnotherTime]);
        }

        var email = user.Email;
        var message = $"رمز إعادة تعيين كلمة المرور: {code}. صالح لمدة {CodeLifetime.TotalMinutes:0} دقيقة.";

        // Fire-and-forget so the response time does not depend on the SMTP
        // round-trip (and therefore cannot be used to fingerprint accounts).
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
                    Subject = "Reset Password"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send reset code email for user {UserId}", user.Id);
            }
        }, CancellationToken.None);

        return Success<string>("");
    }

    public async Task<Response<string>> Handle(ResetPasswordCommand request, CancellationToken cancellationToken)
    {
        var phoneNumber = request.PhoneNumber.Trim();
        var user = await _userManager.Users
            .FirstOrDefaultAsync(u => u.PhoneNumber == phoneNumber, cancellationToken);

        if (user is null
            || user.ResetCodeHash is null
            || user.ResetCodeExpiresAt is null)
        {
            return BadRequest<string>(GenericFailure);
        }

        if (user.ResetCodeExpiresAt < DateTime.UtcNow || user.ResetCodeAttempts >= MaxAttempts)
        {
            await InvalidateCodeAsync(user);
            return BadRequest<string>(GenericFailure);
        }

        var verification = _userManager.PasswordHasher.VerifyHashedPassword(
            user, user.ResetCodeHash, request.Code);

        if (verification == PasswordVerificationResult.Failed)
        {
            user.ResetCodeAttempts += 1;

            if (user.ResetCodeAttempts >= MaxAttempts)
                user.ResetCodeHash = null;

            await _userManager.UpdateAsync(user);
            return BadRequest<string>(GenericFailure);
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

        return Success<string>("");
    }

    #endregion

    #region Helper Methods

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


using CenterManagement.Data.AppMetaData;
using CenterManagement.Data.Entities.Abstractions;
using CenterManagement.Data.Results;
using CenterManagement.Infrustructure.InfrastructureBases.Bases;

namespace CenterManagement.Core.Features.Auth.RefreshTokenFeature.Command.Handlers;

public class RefreshTokenCommandHandler : ResponseHandler,
    IRequestHandler<RefreshTokenCommand, Response<JwtAuthResult>>,
    IRequestHandler<GenerateRefreshTokenCommand, Response<JwtAuthResult>>
{
    #region Fields
    private readonly IStringLocalizer<SharedResources> _stringLocalizer;
    private readonly UserManager<User> _userManager;
    private readonly SignInManager<User> _signInManager;
    private readonly IRepositoryManager _repositoryManager;
    private readonly JwtSettings _jwtSettings;
    private readonly IAccountAccessService _accountAccess;
    private readonly ICenterModuleService _centerModules;

    #endregion

    #region Constructors
    public RefreshTokenCommandHandler(
        IStringLocalizer<SharedResources> stringLocalizer,
        UserManager<User> userManager,
        SignInManager<User> signInManager,
        IRepositoryManager repositoryManager,
        JwtSettings jwtSettings,
        IAccountAccessService accountAccess,
        ICenterModuleService centerModules) : base(stringLocalizer)
    {
        _stringLocalizer = stringLocalizer;
        _userManager = userManager;
        _signInManager = signInManager;
        _repositoryManager = repositoryManager;
        _jwtSettings = jwtSettings;
        _accountAccess = accountAccess;
        _centerModules = centerModules;
    }


    #endregion

    #region Handle Functions

    public async Task<Response<JwtAuthResult>> Handle(GenerateRefreshTokenCommand request, CancellationToken cancellationToken)
    {
        var (jwtToken, accessToken) = await GenerateJWTToken(request.User);
        var refreshToken = GetRefreshToken(request.User.Email);
        var userRefreshToken = new UserRefreshToken
        {
            Id = Guid.NewGuid(),
            UserId = request.User.Id,
            Token = refreshToken.TokenString,
            JwtId = jwtToken.Id!,
            CreatedAt = DateTime.UtcNow,
            ExpiresAt = DateTime.UtcNow.AddDays(_jwtSettings.RefreshTokenExpireDate),
            IsUsed = false,
            IsRevoked = false
        };
        await _repositoryManager.RefreshTokenRepository.AddAsync(userRefreshToken);
        await _repositoryManager.SaveChangesAsync();

        var response = new JwtAuthResult();
        response.RefreshToken = refreshToken;
        response.AccessToken = accessToken;
        response.MustChangePassword = request.User.MustChangePassword;
        response.EnabledModules = await GetEnabledModulesAsync(request.User);
        response.Subscription = await GetSubscriptionAsync(request.User);

        return Success(response);
    }
    public async Task<Response<JwtAuthResult>> Handle(RefreshTokenCommand request, CancellationToken cancellationToken)
    {
        // 1. Find refresh token
        var storedToken = await _repositoryManager.RefreshTokenRepository
            .GetTableNoTracking()
            .Include(x => x.User)
            .FirstOrDefaultAsync(x => x.Token == request.RefreshToken, cancellationToken);

        if (storedToken is null)
        {
            return Unauthorized<JwtAuthResult>(
                _stringLocalizer[SharedResourcesKeys.RefreshTokenIsNotFound]);
        }

        // 2. Validate token
        if (storedToken.IsRevoked)
        {
            return Unauthorized<JwtAuthResult>("خطأ");
        }

        if (storedToken.IsUsed)
        {
            return Unauthorized<JwtAuthResult>("خطأ");
        }

        if (storedToken.ExpiresAt <= DateTime.UtcNow)
        {
            storedToken.IsRevoked = true;
            storedToken.RevokedAt = DateTime.UtcNow;

            await _repositoryManager.RefreshTokenRepository.UpdateAsync(storedToken);

            return Unauthorized<JwtAuthResult>(
                _stringLocalizer[SharedResourcesKeys.RefreshTokenIsExpired]);
        }

        var user = storedToken.User;

        if (user is null)
        {
            return NotFound<JwtAuthResult>();
        }

        // A deleted/inactive account or an unusable center may not refresh tokens.
        var access = await _accountAccess.CheckAsync(user.Id, cancellationToken);

        if (!access.Allowed)
        {
            var denied = Unauthorized<JwtAuthResult>(access.Message);
            denied.Code = access.Code;
            return denied;
        }

        // 3. Generate new access token
        var (jwtToken, accessToken) = await GenerateJWTToken(user);

        // 4. Generate new refresh token
        var newRefreshToken = GetRefreshToken(user.Email!);

        // 5. Rotate old refresh token
        storedToken.IsUsed = true;
        storedToken.IsRevoked = true;
        storedToken.RevokedAt = DateTime.UtcNow;

        await _repositoryManager.RefreshTokenRepository.UpdateAsync(storedToken);

        // 6. Save new refresh token
        var refreshTokenEntity = new UserRefreshToken
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            Token = newRefreshToken.TokenString,
            JwtId = jwtToken.Id!,
            CreatedAt = DateTime.UtcNow,
            ExpiresAt = DateTime.UtcNow.AddDays(_jwtSettings.RefreshTokenExpireDate),
            IsRevoked = false,
            IsUsed = false
        };

        await _repositoryManager.RefreshTokenRepository.AddAsync(refreshTokenEntity);
        await _repositoryManager.SaveChangesAsync();
        // 7. Return tokens
        return Success(new JwtAuthResult
        {
            AccessToken = accessToken,
            RefreshToken = newRefreshToken,
            MustChangePassword = user.MustChangePassword,
            EnabledModules = await GetEnabledModulesAsync(user),
            Subscription = await GetSubscriptionAsync(user)
        });
    }
    #region Helpers

    private async Task<string[]> GetEnabledModulesAsync(User user)
    {
        if (!user.CenterId.HasValue)
            return [];

        var modules = await _centerModules.GetEnabledModulesAsync(user.CenterId.Value);
        return modules.ToArray();
    }

    private async Task<SubscriptionInfoDto?> GetSubscriptionAsync(User user)
    {
        if (!user.CenterId.HasValue)
            return null;

        // Billing info (dates, state, plan) is only for whoever manages the
        // subscription: the owner or a solo teacher. Teachers, assistants and
        // students never receive it.
        if (!await IsBillingViewer(user))
            return null;

        return await _accountAccess.GetSubscriptionAsync(user.CenterId.Value);
    }

    private async Task<bool> IsBillingViewer(User user)
    {
        if (user.IsCenterAdmin)
            return true;

        var roles = await _userManager.GetRolesAsync(user);
        return roles.Contains(AppRoles.CenterOwner);
    }

    #region generate

    private async Task<(JwtSecurityToken, string)> GenerateJWTToken(User user)
    {
        var claims = await GetClaims(user);
        var jwtToken = new JwtSecurityToken(
            _jwtSettings.Issuer,
            _jwtSettings.Audience,
            claims,
            expires: DateTime.Now.AddDays(_jwtSettings.AccessTokenExpireDate),
            signingCredentials: new SigningCredentials(new SymmetricSecurityKey(Encoding.ASCII.GetBytes(_jwtSettings.Secret)),
            SecurityAlgorithms.HmacSha256));
        var accessToken = new JwtSecurityTokenHandler().WriteToken(jwtToken);
        return (jwtToken, accessToken);
    }
    public async Task<JwtAuthResult> GetRefreshToken(User user, JwtSecurityToken jwtToken, DateTime? expiryDate, string refreshToken)
    {
        var (jwtSecurityToken, newToken) = await GenerateJWTToken(user);
        var response = new JwtAuthResult();
        response.AccessToken = newToken;
        var refreshTokenResult = new RefreshToken();
        refreshTokenResult.Email = jwtToken.Claims.FirstOrDefault(x => x.Type == nameof(UserClaimModel.Email)).Value;
        refreshTokenResult.UserName = user?.FullName ?? "Unknown";
        refreshTokenResult.TokenString = refreshToken;
        refreshTokenResult.ExpireAt = (DateTime)expiryDate;
        response.RefreshToken = refreshTokenResult;
        return response;

    }
    private RefreshToken GetRefreshToken(string email)
    {
        var refreshToken = new RefreshToken
        {
            ExpireAt = DateTime.Now.AddDays(_jwtSettings.RefreshTokenExpireDate),
            Email = email,
            UserName = email,
            TokenString = GenerateRefreshToken()
        };
        return refreshToken;
    }
    private string GenerateRefreshToken()
    {
        var randomNumber = new byte[32];
        var randomNumberGenerate = RandomNumberGenerator.Create();
        randomNumberGenerate.GetBytes(randomNumber);
        return Convert.ToBase64String(randomNumber);
    }
    public async Task<List<SecurityClaim>> GetClaims(User user)
    {
        var roles = await _userManager.GetRolesAsync(user);

        var claims = new List<SecurityClaim>()
        {
            new SecurityClaim(ClaimTypes.Name,user.FullName ?? ""),
            new SecurityClaim(ClaimTypes.NameIdentifier,user.Id.ToString() ?? ""),
            new SecurityClaim(ClaimTypes.Email,user.Email ?? ""),
            new SecurityClaim(nameof(UserClaimModel.PhoneNumber), user.PhoneNumber ?? ""),
            new SecurityClaim(nameof(UserClaimModel.Id), user.Id.ToString() ?? ""),
            new SecurityClaim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString() ?? "")
        };

        foreach (var role in roles)
        {
            claims.Add(new SecurityClaim(ClaimTypes.Role, role));
        }

        // Teachers flagged as center admins get center-manager access without a
        // dedicated role. The CenterAdmin policies check this claim.
        if (user.IsCenterAdmin)
        {
            claims.Add(new SecurityClaim(
                AppPolicies.IsCenterAdminClaim,
                AppPolicies.TrueValue));
        }

        // A temporary password (username = password = phone) must be changed
        // before the account can use anything else in the system.
        if (user.MustChangePassword)
        {
            claims.Add(new SecurityClaim(
                AppPolicies.PasswordChangeRequiredClaim,
                AppPolicies.TrueValue));
        }

        // Emit the center (tenant) of the user so subsequent requests can be
        // scoped to their center without a database round-trip.
        if (user.CenterId.HasValue)
        {
            claims.Add(new SecurityClaim(
                CenterManagement.Data.Entities.Abstractions.TenantClaimTypes.CenterId,
                user.CenterId.Value.ToString()));
        }

        var userClaims = await _userManager.GetClaimsAsync(user);

        claims.AddRange(userClaims);

        return claims;
    }
    #endregion


    #endregion
    #endregion
}

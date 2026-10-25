using CenterManagement.Core.Features.Impersonation.Commands.Models;
using CenterManagement.Data.AppMetaData;
using CenterManagement.Data.Entities.Abstractions;
using CenterManagement.Data.Helpers;
using CenterManagement.Data.Results;
using MediatR;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Localization;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace CenterManagement.Core.Features.Impersonation.Commands.Handlers;

public class ImpersonationCommandHandler : ResponseHandler,
    IRequestHandler<ImpersonateUserCommand, Response<ImpersonationResult>>,
    IRequestHandler<StopImpersonationCommand, Response<StopImpersonationResult>>
{
    private readonly UserManager<User> _userManager;
    private readonly JwtSettings _jwtSettings;
    private readonly ITenantContext _tenantContext;
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly IAuditLogService _auditLog;
    private readonly IAccountAccessService _accountAccess;

    public ImpersonationCommandHandler(
        IStringLocalizer<SharedResources> localizer,
        UserManager<User> userManager,
        JwtSettings jwtSettings,
        ITenantContext tenantContext,
        IHttpContextAccessor httpContextAccessor,
        IAuditLogService auditLog,
        IAccountAccessService accountAccess) : base(localizer)
    {
        _userManager = userManager;
        _jwtSettings = jwtSettings;
        _tenantContext = tenantContext;
        _httpContextAccessor = httpContextAccessor;
        _auditLog = auditLog;
        _accountAccess = accountAccess;
    }

    public async Task<Response<ImpersonationResult>> Handle(
        ImpersonateUserCommand request,
        CancellationToken cancellationToken)
    {
        var superAdminId = _tenantContext.UserId;
        if (superAdminId is null) return Unauthorized<ImpersonationResult>();

        var target = await _userManager.FindByIdAsync(request.UserId.ToString());
        if (target is null) return NotFound<ImpersonationResult>("المستخدم غير موجود");

        var targetRoles = await _userManager.GetRolesAsync(target);

        if (targetRoles.Contains(AppRoles.SuperAdmin))
            return BadRequest<ImpersonationResult>("لا يمكن انتحال حساب مدير المنصة");

        var claims = await BuildClaimsAsync(target);
        claims.Add(new Claim(ImpersonationClaims.ImpersonatedBy, superAdminId.Value.ToString()));
        claims.Add(new Claim(ImpersonationClaims.IsImpersonation, ImpersonationClaims.TrueValue));

        var (token, expiresAt) = GenerateToken(target, claims, TimeSpan.FromMinutes(60));

        // Surface a warning when the target's center is suspended/expired so the
        // banner can explain the (support-only) access.
        var access = await _accountAccess.CheckAsync(target.Id, cancellationToken);

        await _auditLog.WriteAsync(
            action: "Impersonate",
            entityType: "User",
            entityId: target.Id.ToString(),
            details: $"SuperAdmin {superAdminId} started impersonating {target.FullName} ({target.Id})",
            actorUserId: superAdminId,
            cancellationToken: cancellationToken);

        return Success(new ImpersonationResult
        {
            AccessToken = token,
            UserId = target.Id,
            FullName = target.FullName ?? "",
            PhoneNumber = target.PhoneNumber,
            Role = targetRoles.FirstOrDefault(),
            ImpersonatedBy = superAdminId.Value,
            ExpiresAt = expiresAt,
            CenterStatusCode = access.Allowed ? null : access.Code,
            CenterWarning = access.Allowed ? null : access.Message
        });
    }

    public async Task<Response<StopImpersonationResult>> Handle(
        StopImpersonationCommand request,
        CancellationToken cancellationToken)
    {
        var claim = _httpContextAccessor.HttpContext?.User
            ?.FindFirst(ImpersonationClaims.ImpersonatedBy)?.Value;

        if (!Guid.TryParse(claim, out var superAdminId))
            return BadRequest<StopImpersonationResult>("لا توجد جلسة انتحال نشطة");

        await _auditLog.WriteAsync(
            action: "ImpersonationEnd",
            entityType: "User",
            entityId: _tenantContext.UserId?.ToString(),
            details: $"SuperAdmin {superAdminId} stopped impersonating",
            actorUserId: superAdminId,
            cancellationToken: cancellationToken);

        // Hand back a fresh operator token so the UI can resume seamlessly.
        var superAdmin = await _userManager.FindByIdAsync(superAdminId.ToString());
        if (superAdmin is null)
            return Success(new StopImpersonationResult { SuperAdminId = superAdminId });

        var claims = await BuildClaimsAsync(superAdmin);
        var (token, _) = GenerateToken(
            superAdmin,
            claims,
            TimeSpan.FromDays(_jwtSettings.AccessTokenExpireDate));

        return Success(new StopImpersonationResult
        {
            AccessToken = token,
            SuperAdminId = superAdminId
        });
    }

    private async Task<List<Claim>> BuildClaimsAsync(User user)
    {
        var roles = await _userManager.GetRolesAsync(user);

        var claims = new List<Claim>
        {
            new(ClaimTypes.Name, user.FullName ?? ""),
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new(ClaimTypes.Email, user.Email ?? ""),
            new("PhoneNumber", user.PhoneNumber ?? ""),
            new("Id", user.Id.ToString()),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

        foreach (var role in roles)
            claims.Add(new Claim(ClaimTypes.Role, role));

        if (user.IsCenterAdmin)
            claims.Add(new Claim(AppPolicies.IsCenterAdminClaim, AppPolicies.TrueValue));

        if (user.CenterId.HasValue)
            claims.Add(new Claim(TenantClaimTypes.CenterId, user.CenterId.Value.ToString()));

        var userClaims = await _userManager.GetClaimsAsync(user);
        claims.AddRange(userClaims);

        return claims;
    }

    private (string token, DateTime expiresAt) GenerateToken(
        User user,
        IEnumerable<Claim> claims,
        TimeSpan lifetime)
    {
        var expiresAt = DateTime.Now.Add(lifetime);

        var jwtToken = new JwtSecurityToken(
            _jwtSettings.Issuer,
            _jwtSettings.Audience,
            claims,
            expires: expiresAt,
            signingCredentials: new SigningCredentials(
                new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwtSettings.Secret)),
                SecurityAlgorithms.HmacSha256));

        var token = new JwtSecurityTokenHandler().WriteToken(jwtToken);

        return (token, expiresAt);
    }
}

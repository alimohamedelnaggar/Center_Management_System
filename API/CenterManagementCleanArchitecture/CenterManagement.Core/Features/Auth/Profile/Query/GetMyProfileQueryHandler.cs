using CenterManagement.Core.Bases;
using CenterManagement.Core.Features.Auth.Profile.Query.Models;
using CenterManagement.Data.Entities.Abstractions;
using CenterManagement.Data.Entities.Identity;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Localization;
using CenterManagement.Core.Resources;
using MediatR;
using System.Security.Claims;

namespace CenterManagement.Core.Features.Auth.Profile.Query.Handlers;

public class GetMyProfileQueryHandler
    : ResponseHandler,
      IRequestHandler<GetMyProfileQuery, Response<GetMyProfileDto>>
{
    private readonly UserManager<User> _userManager;
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly ICenterModuleService _centerModules;
    private readonly IAccountAccessService _accountAccess;
    private readonly CenterManagement.Infrustructure.Data.AppDbContext _context;

    public GetMyProfileQueryHandler(
        UserManager<User> userManager,
        IHttpContextAccessor httpContextAccessor,
        ICenterModuleService centerModules,
        IAccountAccessService accountAccess,
        CenterManagement.Infrustructure.Data.AppDbContext context,
        IStringLocalizer<SharedResources> localizer)
        : base(localizer)
    {
        _userManager = userManager;
        _httpContextAccessor = httpContextAccessor;
        _centerModules = centerModules;
        _accountAccess = accountAccess;
        _context = context;
    }

    public async Task<Response<GetMyProfileDto>> Handle(
        GetMyProfileQuery request,
        CancellationToken cancellationToken)
    {
        var userId = _httpContextAccessor.HttpContext?
            .User
            .FindFirstValue(ClaimTypes.NameIdentifier);

        if (string.IsNullOrEmpty(userId))
            return Unauthorized<GetMyProfileDto>();

        var user = await _userManager.FindByIdAsync(userId);

        if (user == null)
            return NotFound<GetMyProfileDto>();

        var dto = new GetMyProfileDto
        {
            Id = user.Id,
            FullName = user.FullName,
            Email = user.Email,
            PhoneNumber = user.PhoneNumber,
            UserName = user.UserName,
            Address = user.Address,
            Code = user.Code,
            CreatedAt = user.CreatedAt
        };

        // The caller's own subject (teachers only) — a solo teacher edits it
        // from his profile; the UI prompts when it is still missing.
        dto.Subject = await _context.TeacherProfiles
            .Where(tp => tp.UserId == user.Id)
            .Select(tp => tp.Subject)
            .FirstOrDefaultAsync(cancellationToken);

        if (user.CenterId.HasValue)
        {
            var modules = await _centerModules.GetEnabledModulesAsync(user.CenterId.Value, cancellationToken);
            dto.EnabledModules = modules.ToArray();

            // Center type drives which (multi-teacher) UI is exposed for every
            // role of this center. Always read it fresh from the DB.
            dto.CenterType = await _context.Centers
                .Where(c => c.Id == user.CenterId.Value)
                .Select(c => c.Type.ToString())
                .FirstOrDefaultAsync(cancellationToken);

            // Billing snapshot only for the owner / solo teacher; teachers,
            // assistants and students never receive dates or prices.
            if (await IsBillingViewer(user))
                dto.Subscription = await _accountAccess.GetSubscriptionAsync(user.CenterId.Value, cancellationToken);
        }

        return Success(dto);
    }

    private async Task<bool> IsBillingViewer(User user)
    {
        if (user.IsCenterAdmin)
            return true;

        var roles = await _userManager.GetRolesAsync(user);
        return roles.Contains(CenterManagement.Data.AppMetaData.AppRoles.CenterOwner);
    }
}
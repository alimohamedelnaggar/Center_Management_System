using System.Security.Claims;
using CenterManagement.Core.Bases;
using CenterManagement.Core.Features.Centers.Queries.Models;
using CenterManagement.Data.AppMetaData;
using CenterManagement.Data.Entities.Identity;
using CenterManagement.Infrustructure.InfrastructureBases.Bases;
using MediatR;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Localization;

namespace CenterManagement.Core.Features.Centers.Queries.Handlers;

public class GetMyCentersQueryHandler : ResponseHandler, IRequestHandler<GetMyCentersQuery, Response<List<CenterDto>>>
{
    private readonly IRepositoryManager _repositoryManager;
    private readonly UserManager<User> _userManager;
    private readonly IHttpContextAccessor _httpContextAccessor;

    public GetMyCentersQueryHandler(
        IStringLocalizer<SharedResources> localizer,
        IRepositoryManager repositoryManager,
        UserManager<User> userManager,
        IHttpContextAccessor httpContextAccessor) : base(localizer)
    {
        _repositoryManager = repositoryManager;
        _userManager = userManager;
        _httpContextAccessor = httpContextAccessor;
    }

    public async Task<Response<List<CenterDto>>> Handle(GetMyCentersQuery request, CancellationToken cancellationToken)
    {
        var userId = GetUserId();

        var user = await _userManager.FindByIdAsync(userId.ToString());
        if (user is null) return Unauthorized<List<CenterDto>>("المستخدم غير موجود");

        var roles = await _userManager.GetRolesAsync(user);

        var isPrivileged = roles.Contains(AppRoles.SuperAdmin);

        var centers = await _repositoryManager.CenterRepository.FindAllAsync(center =>
            isPrivileged
            || center.OwnerId == userId
            || (user.CenterId != null && center.Id == user.CenterId));

        var data = centers
            .OrderByDescending(center => center.CreatedAt)
            .Select(center => new CenterDto
            {
                Id = center.Id,
                Name = center.Name,
                LogoUrl = center.LogoUrl,
                Phone = center.Phone,
                Address = center.Address,
                ThemeColor = center.ThemeColor,
                Description = center.Description,
                IsActive = center.IsActive,
                OwnerId = center.OwnerId,
                CreatedAt = center.CreatedAt
            })
            .ToList();

        return Success(data);
    }

    private Guid GetUserId()
    {
        var id = _httpContextAccessor.HttpContext?.User?
            .Claims
            .FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier)?
            .Value;

        if (Guid.TryParse(id, out var userId)) return userId;

        var alt = _httpContextAccessor.HttpContext?.User?.FindFirst("Id")?.Value;
        if (Guid.TryParse(alt, out var altId)) return altId;

        throw new UnauthorizedAccessException("هذا المستخدم غير مصرح له");
    }
}

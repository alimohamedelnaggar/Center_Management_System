using CenterManagement.Core.Features.Auth.CurrentUserFeature.Queries.Models;

namespace CenterManagement.Core.Features.Auth.CurrentUserFeature.Queries.Handlers;

public class CurrentUserQueryHandler : ResponseHandler,
    IRequestHandler<GetUserQuery, Response<User>>,
    IRequestHandler<GetUserIdQuery, Response<Guid>>,
    IRequestHandler<GetUserRoleQuery, Response<string>>,
    IRequestHandler<GetCurrentUserRolesQuery, Response<List<string>>>
{
    #region Fields

    private readonly IStringLocalizer<SharedResources> _sharedResources;
    private readonly UserManager<User> _userManager;
    private readonly IHttpContextAccessor _httpContextAccessor;

    #endregion

    #region Constructors

    public CurrentUserQueryHandler(
        IStringLocalizer<SharedResources> stringLocalizer,
        UserManager<User> userManager,
        IHttpContextAccessor httpContextAccessor)
        : base(stringLocalizer)
    {
        _sharedResources = stringLocalizer;
        _userManager = userManager;
        _httpContextAccessor = httpContextAccessor;
    }

    #endregion

    #region Handle Functions

    public async Task<Response<User>> Handle(GetUserQuery request, CancellationToken cancellationToken)
    {
        var user = await GetUserAsync();
        return Success(user);
    }

    public Task<Response<Guid>> Handle(GetUserIdQuery request, CancellationToken cancellationToken)
    {
        return Task.FromResult(Success(GetUserId()));
    }
    public Task<Response<string>> Handle(GetUserRoleQuery request, CancellationToken cancellationToken)
    {
        return Task.FromResult(Success(GetUserRole()));
    }

    public async Task<Response<List<string>>> Handle(GetCurrentUserRolesQuery request, CancellationToken cancellationToken)
    {
        var roles = await GetCurrentUserRolesAsync();
        return Success(roles);
    }

    #endregion

    #region Helpers

    private Guid GetUserId()
    {
        var id = _httpContextAccessor.HttpContext?.User?
                   .Claims
                   .FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier)
                   ?.Value
               ?? throw new UnauthorizedAccessException("هذا المستخدم غير مصرح له بالدخول");

        var isd = _httpContextAccessor.HttpContext?.User?
            .FindFirst("Id")?
            .Value
            ?? throw new UnauthorizedAccessException("هذا المستخدم غير مصرح له بالدخول");

        return Guid.Parse(id);

    }
    private string GetUserRole()
    {
        return _httpContextAccessor.HttpContext?.User?
                   .Claims
                   .FirstOrDefault(c => c.Type == nameof(UserClaimModel.Role))
                   ?.Value
               ?? throw new UnauthorizedAccessException("هذا المستخدم غير مصرح له بالدخول");
    }

    private async Task<User> GetUserAsync()
    {
        var userId = GetUserId();

        return await _userManager.FindByIdAsync(userId.ToString())
               ?? throw new UnauthorizedAccessException("User not found.");
    }

    private async Task<List<string>> GetCurrentUserRolesAsync()
    {
        var user = await GetUserAsync();
        var roles = await _userManager.GetRolesAsync(user);

        return roles.ToList();
    }

    #endregion
}
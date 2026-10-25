namespace CenterManagement.Core.Features.Auth.Authorization.Quaries.Handlers;

public class RoleQueryHandler : ResponseHandler,
    IRequestHandler<GetRolesListQuery, Response<List<GetRolesListResult>>>,
    IRequestHandler<GetRoleByIdQuery, Response<GetRoleByIdResult>>,
    IRequestHandler<ManageUserRolesQuery, Response<ManageUserRolesResult>>
{
    #region Fields

    private readonly IStringLocalizer<SharedResources> _stringLocalizer;
    private readonly UserManager<User> _userManager;
    private readonly RoleManager<Role> _roleManager;

    #endregion

    #region Constructors

    public RoleQueryHandler(
        IStringLocalizer<SharedResources> stringLocalizer,
        UserManager<User> userManager,
        RoleManager<Role> roleManager)
        : base(stringLocalizer)
    {
        _stringLocalizer = stringLocalizer;
        _userManager = userManager;
        _roleManager = roleManager;
    }

    #endregion

    #region Handle Functions

    public async Task<Response<List<GetRolesListResult>>> Handle(
        GetRolesListQuery request,
        CancellationToken cancellationToken)
    {
        //var roles = await _roleManager.Roles.ToListAsync(cancellationToken);

        //var result = _mapper.Map<List<GetRolesListResult>>(roles);

        //return Success(result);
        return null;

    }

    public async Task<Response<GetRoleByIdResult>> Handle(
        GetRoleByIdQuery request,
        CancellationToken cancellationToken)
    {
        //var role = await _roleManager.FindByIdAsync(request.Id.ToString());

        //if (role is null)
        //    return NotFound<GetRoleByIdResult>(
        //        _stringLocalizer[SharedResourcesKeys.RoleNotExist]);

        //var result = _mapper.Map<GetRoleByIdResult>(role);

        //return Success(result);
        return null;

    }

    public async Task<Response<ManageUserRolesResult>> Handle(
        ManageUserRolesQuery request,
        CancellationToken cancellationToken)
    {
        var user = await _userManager.FindByIdAsync(request.UserId.ToString());

        if (user is null)
            return NotFound<ManageUserRolesResult>(
                _stringLocalizer[SharedResourcesKeys.UserIsNotFound]);

        var userRoles = await _userManager.GetRolesAsync(user);

        var roles = await _roleManager.Roles.ToListAsync(cancellationToken);

        var result = new ManageUserRolesResult
        {
            UserId = user.Id,
            //UserName = user.UserName,
            userRoles = roles.Select(role => new UserRoles
            {
                Name = role.Name!,
                HasRole = userRoles.Contains(role.Name!)
            }).ToList()
        };

        return Success(result);
    }

    #endregion
}
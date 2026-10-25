namespace CenterManagement.Core.Features.Auth.Authorization.Commands.Handlers;

public class RoleCommandHandler : ResponseHandler,
    IRequestHandler<AddRoleCommand, Response<string>>,
    IRequestHandler<EditRoleCommand, Response<string>>,
    IRequestHandler<DeleteRoleCommand, Response<string>>,
    IRequestHandler<UpdateUserRolesCommand, Response<string>>
{
    #region Fields

    private readonly IStringLocalizer<SharedResources> _stringLocalizer;
    private readonly RoleManager<Role> _roleManager;
    private readonly UserManager<User> _userManager;
    private readonly AppDbContext _dbContext;

    #endregion

    #region Constructor

    public RoleCommandHandler(
        IStringLocalizer<SharedResources> stringLocalizer,
        RoleManager<Role> roleManager,
        UserManager<User> userManager,
        AppDbContext dbContext)
        : base(stringLocalizer)
    {
        _stringLocalizer = stringLocalizer;
        _roleManager = roleManager;
        _userManager = userManager;
        _dbContext = dbContext;
    }

    #endregion

    #region Add Role

    public async Task<Response<string>> Handle(
        AddRoleCommand request,
        CancellationToken cancellationToken)
    {
        var roleExists = await _roleManager.RoleExistsAsync(request.RoleName);

        if (roleExists)
            return BadRequest<string>("Role already exists.");

        var role = new Role
        {
            Name = request.RoleName
        };

        var result = await _roleManager.CreateAsync(role);

        if (result.Succeeded)
            return Success((string)_stringLocalizer[SharedResourcesKeys.Success]);

        return BadRequest<string>(
            string.Join(" - ", result.Errors.Select(e => e.Description)));
    }

    #endregion

    #region Edit Role

    public async Task<Response<string>> Handle(
        EditRoleCommand request,
        CancellationToken cancellationToken)
    {
        var result = await EditRoleAsync(request);

        return result switch
        {
            "NotFound" => NotFound<string>(),
            "Success" => Success((string)_stringLocalizer[SharedResourcesKeys.Updated]),
            _ => BadRequest<string>(result)
        };
    }

    private async Task<string> EditRoleAsync(EditRoleRequest request)
    {
        var role = await _roleManager.FindByIdAsync(request.Id.ToString());

        if (role is null)
            return "NotFound";

        role.Name = request.Name;

        var result = await _roleManager.UpdateAsync(role);

        if (result.Succeeded)
            return "Success";

        return string.Join(
            " - ",
            result.Errors.Select(e => e.Description));
    }

    #endregion

    #region Delete Role

    public async Task<Response<string>> Handle(DeleteRoleCommand request, CancellationToken cancellationToken)
    {
        var role = await _roleManager.FindByIdAsync(request.Id.ToString());

        if (role is null)
            return NotFound<string>();

        var result = await _roleManager.DeleteAsync(role);

        if (!result.Succeeded)
        {
            return BadRequest<string>(
                string.Join(" - ", result.Errors.Select(e => e.Description)));
        }

        return Success((string)_stringLocalizer[SharedResourcesKeys.Deleted]);
    }

    #endregion

    #region Update User Roles

    public async Task<Response<string>> Handle(
        UpdateUserRolesCommand request,
        CancellationToken cancellationToken)
    {
        var result = await UpdateUserRolesAsync(request);

        return result switch
        {
            "UserIsNull" => NotFound<string>(_stringLocalizer[SharedResourcesKeys.UserIsNotFound]),
            "FailedToRemoveOldRoles" => BadRequest<string>(_stringLocalizer[SharedResourcesKeys.FailedToRemoveOldRoles]),
            "FailedToAddNewRoles" => BadRequest<string>(_stringLocalizer[SharedResourcesKeys.FailedToAddNewRoles]),
            "FailedToUpdateUserRoles" => BadRequest<string>(_stringLocalizer[SharedResourcesKeys.FailedToUpdateUserRoles]),
            _ => Success((string)_stringLocalizer[SharedResourcesKeys.Success])
        };
    }

    private async Task<string> UpdateUserRolesAsync(UpdateUserRolesRequest request)
    {
        await using var transaction =
            await _dbContext.Database.BeginTransactionAsync();

        try
        {
            var user =
                await _userManager.FindByIdAsync(request.UserId.ToString());

            if (user is null)
            {
                await transaction.RollbackAsync();
                return "UserIsNull";
            }

            var currentRoles =
                await _userManager.GetRolesAsync(user);

            var removeResult =
                await _userManager.RemoveFromRolesAsync(user, currentRoles);

            if (!removeResult.Succeeded)
            {
                await transaction.RollbackAsync();
                return "FailedToRemoveOldRoles";
            }

            //var selectedRoles = request.UserRoles
            //    .Where(x => x.HasRole)
            //    .Select(x => x.Name)
            //    .ToList();

            //var addResult =
            //    await _userManager.AddToRolesAsync(user, selectedRoles);

            //if (!addResult.Succeeded)
            //{
            //    await transaction.RollbackAsync();
            //    return "FailedToAddNewRoles";
            //}

            await transaction.CommitAsync();

            return "Success";
        }
        catch
        {
            await transaction.RollbackAsync();
            return "FailedToUpdateUserRoles";
        }
    }

    #endregion
}
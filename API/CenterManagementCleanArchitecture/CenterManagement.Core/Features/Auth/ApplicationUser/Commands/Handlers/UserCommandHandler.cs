
namespace CenterManagement.Core.Features.Auth.ApplicationUser.Commands.Handlers;

public class UserCommandHandler : ResponseHandler,
    IRequestHandler<AddUserCommand, Response<string>>,
    IRequestHandler<EditUserCommand, Response<string>>,
    IRequestHandler<DeleteUserCommand, Response<string>>,
    IRequestHandler<ChangeUserPasswordCommand, Response<string>>
{
    #region Fields
    private readonly AppDbContext _context;
    private readonly IStringLocalizer<SharedResources> _sharedResources;
    private readonly UserManager<User> _userManager;
    private readonly RoleManager<Role> _roleManager;
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly IUrlHelper _urlHelper;
    private readonly IMediator _mediator;
    #endregion

    #region Constructors
    public UserCommandHandler(IStringLocalizer<SharedResources> stringLocalizer,
                              UserManager<User> userManager,
                              RoleManager<Role> roleManager,
                              IHttpContextAccessor httpContextAccessor,
                              AppDbContext context,
                              IUrlHelper urlHelper,
                              IMediator mediator) : base(stringLocalizer)
    {
        _sharedResources = stringLocalizer;
        _userManager = userManager;
        _roleManager = roleManager;
        _httpContextAccessor = httpContextAccessor;
        _context = context;
        _urlHelper = urlHelper;
        _mediator = mediator;
    }


    #endregion

    #region Handle Functions

    #region Add User
    public async Task<Response<string>> Handle(AddUserCommand request, CancellationToken cancellationToken)
    {
        //var normalizedEmail = request.Email?.Trim();
        //var normalizedDisplayName = request.FullName?.Trim();
        //var normalizedPhoneNumber = request.PhoneNumber?.Trim();
        //var normalizedRole = request.Role?.Trim();

        //if (string.IsNullOrWhiteSpace(normalizedEmail))
        //    return BadRequest<string>("Email is required");

        //if (string.IsNullOrWhiteSpace(normalizedRole))
        //    return BadRequest<string>("Role is required");

        //if (!request.AcceptTerms)
        //    return BadRequest<string>("You must accept terms and conditions");

        //if (request.Password != request.ConfirmPassword)
        //{
        //    return BadRequest<string>("Password and Confirm Password do not match");
        //}
        ////var identityUser = request.MapToUser();

        ////identityUser.Email = normalizedEmail;
        ////identityUser.UserName = normalizedEmail;
        ////identityUser.Name = normalizedDisplayName ?? string.Empty;
        ////identityUser.PhoneNumber = normalizedPhoneNumber;
        //User identityUser;

        //if (normalizedRole.Equals("Student", StringComparison.OrdinalIgnoreCase))
        //{
        //    identityUser = new Student
        //    {
        //        Email = normalizedEmail,
        //        UserName = normalizedEmail,
        //        FullName = normalizedDisplayName ?? string.Empty,
        //        PhoneNumber = normalizedPhoneNumber
        //    };
        //}

        ////Create
        //var createResult = await AddUserAsync(
        //    identityUser,
        //    request.Password,
        //    normalizedRole
        //);

        //switch (createResult)
        //{
        //    case "EmailIsExist": return BadRequest<string>(_sharedResources[SharedResourcesKeys.EmailIsExist]);
        //    case "UserNameIsExist": return BadRequest<string>(_sharedResources[SharedResourcesKeys.UserNameIsExist]);
        //    case "InvalidRole": return BadRequest<string>("Role must be either Client or Lawyer and already exist in the system");
        //    case "ErrorInCreateUser": return BadRequest<string>(_sharedResources[SharedResourcesKeys.FaildToAddUser]);
        //    case "Failed": return BadRequest<string>(_sharedResources[SharedResourcesKeys.TryToRegisterAgain]);
        //    case "Success": return Success<string>("Register is Success");
        //    default: return BadRequest<string>(createResult);
        //}

        return Success<string>("Register is Success");
    }
    public async Task<string> AddUserAsync(User user, string password, string role)
    {
        var normalizedRole = role.Equals("lawyer", StringComparison.OrdinalIgnoreCase)
            ? "Lawyer"
            : role.Equals("client", StringComparison.OrdinalIgnoreCase)
                ? "Client"
                : string.Empty;

        if (string.IsNullOrEmpty(normalizedRole))
            return "InvalidRole";

        var roleExists = await _roleManager.RoleExistsAsync(normalizedRole);
        if (!roleExists)
            return "InvalidRole";

        var existUser = await _userManager.FindByEmailAsync(user.Email!);
        if (existUser != null)
            return "EmailIsExist";

        await using var trans = await _context.Database.BeginTransactionAsync();
        try
        {
            //Create
            var createResult = await _userManager.CreateAsync(user, password);
            //Failed
            if (!createResult.Succeeded)
                return string.Join(",", createResult.Errors.Select(x => x.Description).ToList());

            var roleResult = await _userManager.AddToRoleAsync(user, normalizedRole);

            if (!roleResult.Succeeded)
                return string.Join(",", roleResult.Errors.Select(x => x.Description));



            await _context.SaveChangesAsync();

            //Send Confirm Email
            var code = await _userManager.GenerateEmailConfirmationTokenAsync(user);
            var httpContext = _httpContextAccessor.HttpContext;
            if (httpContext == null)
                return "Failed";

            var resquestAccessor = httpContext.Request;

            var urlActionContext = new UrlActionContext
            {
                Action = "ConfirmEmail",
                Controller = "ConfirmEmail",
                Values = new
                {
                    userId = (await _mediator.Send(new EncryptionProviderCommand { Data = user.Id.ToString() })).Data,
                    code = (await _mediator.Send(new EncryptionProviderCommand { Data = code })).Data
                }
            };
            var returnUrl = resquestAccessor.Scheme + "://" + resquestAccessor.Host + _urlHelper.Action(urlActionContext);

            var message = $"To Confirm Email Click Link: <a href='{returnUrl}'>Link Of Confirmation</a>";

            //message or body
            await _mediator.Send(new SendEmailCommand
            {
                Email = user.Email!,
                Message = message,
                Subject = "Confirm Your Email"
            });
            await trans.CommitAsync();
            return "Success";
        }
        catch (Exception ex)
        {
            await trans.RollbackAsync();
            return ex.InnerException?.Message ?? ex.Message;
        }

    }


    #endregion

    #region Edit User
    public async Task<Response<string>> Handle(EditUserCommand request, CancellationToken cancellationToken)
    {
        //check if user is exist
        var oldUser = await _userManager.FindByIdAsync(request.Id.ToString());
        //if Not Exist notfound
        if (oldUser == null) return NotFound<string>();
        //mapping
        var newUser = oldUser;

        //if username is Exist
        var userByUserName = await _userManager.Users.FirstOrDefaultAsync(x =>
        x.UserName == newUser.UserName
        && x.Id != newUser.Id);
        //username is Exist
        if (userByUserName != null) return BadRequest<string>(_sharedResources[SharedResourcesKeys.UserNameIsExist]);

        //update
        var result = await _userManager.UpdateAsync(newUser);
        //result is not success
        if (!result.Succeeded) return BadRequest<string>(_sharedResources[SharedResourcesKeys.UpdateFailed]);
        //message
        return Success((string)_sharedResources[SharedResourcesKeys.Updated]);
    }

    #endregion

    #region Delete User

    public async Task<Response<string>> Handle(DeleteUserCommand request, CancellationToken cancellationToken)
    {
        //check if user is exist
        var user = await _userManager.FindByIdAsync(request.Id.ToString());
        //if Not Exist notfound
        if (user == null) return NotFound<string>();
        //Delete the User
        var result = await _userManager.DeleteAsync(user);
        //in case of Failure
        if (!result.Succeeded) return BadRequest<string>(_sharedResources[SharedResourcesKeys.DeletedFailed]);
        return Success((string)_sharedResources[SharedResourcesKeys.Deleted]);
    }

    #endregion


    #region change password
    public async Task<Response<string>> Handle(ChangeUserPasswordCommand request, CancellationToken cancellationToken)
    {
        //get user
        //check if user is exist
        var user = await _userManager.FindByIdAsync(request.Id.ToString());
        //if Not Exist notfound
        if (user == null) return NotFound<string>();

        //Change User Password
        var result = await _userManager.ChangePasswordAsync(user, request.CurrentPassword, request.NewPassword);
        //var user1=await _userManager.HasPasswordAsync(user);
        //await _userManager.RemovePasswordAsync(user);
        //await _userManager.AddPasswordAsync(user, request.NewPassword);

        //result
        if (!result.Succeeded)
            return BadRequest<string>(result.Errors.FirstOrDefault()?.Description ?? (string)_sharedResources[SharedResourcesKeys.UpdateFailed]);
        return Success((string)_sharedResources[SharedResourcesKeys.Success]);
    }

    #endregion

    #endregion
}


using CenterManagement.Data.Entities.Abstractions;

namespace CenterManagement.Core.Features.Auth.Authentication.Command.Handlers;

public class AuthenticationCommandHandler : ResponseHandler,
    IRequestHandler<SignInCommand, Response<JwtAuthResult>>,
    IRequestHandler<LogoutCommand, Response<string>>
{


    #region Fields
    private readonly IStringLocalizer<SharedResources> _stringLocalizer;
    private readonly UserManager<User> _userManager;
    private readonly SignInManager<User> _signInManager;
    private readonly IMediator _mediator;
    private readonly IAccountAccessService _accountAccess;


    #endregion

    #region Constructors
    public AuthenticationCommandHandler(
        IStringLocalizer<SharedResources> stringLocalizer,
        UserManager<User> userManager,
        SignInManager<User> signInManager,
        IMediator mediator,
        IAccountAccessService accountAccess) : base(stringLocalizer)
    {
        _stringLocalizer = stringLocalizer;
        _userManager = userManager;
        _signInManager = signInManager;
        _mediator = mediator;
        _accountAccess = accountAccess;
    }


    #endregion

    #region Handle Functions
    public async Task<Response<JwtAuthResult>> Handle(SignInCommand request, CancellationToken cancellationToken)
    {
        //Check if user is exist or not
        var user = await _userManager.Users
                   .FirstOrDefaultAsync(x =>
                   x.PhoneNumber == request.PhoneNumber);

        //Return The UserName Not Found
        if (user == null) return BadRequest<JwtAuthResult>("هذا الحساب غير مسجل بالموقع");

        // Students/parents sign in with a phone-number credential, so apply
        // Identity lockout to them after repeated failures (in addition to the
        // per-IP / per-phone rate limiter).
        var lockoutOnFailure =
            await _userManager.IsInRoleAsync(user, AppRoles.Student) ||
            await _userManager.IsInRoleAsync(user, AppRoles.Parent);

        //try To Sign in 
        var signInResult = await _signInManager.CheckPasswordSignInAsync(user, request.Password, lockoutOnFailure);

        if (signInResult.IsLockedOut)
            return BadRequest<JwtAuthResult>(
                "تم قفل الحساب مؤقتًا بعد محاولات دخول خاطئة متكررة. حاول بعد قليل.");

        //if Failed Return Passord is wrong
        if (!signInResult.Succeeded) return BadRequest<JwtAuthResult>("كلمة المرور او رقم الهاتف غير صحيح");

        // Block sign-in when the account or its center is no longer usable.
        var access = await _accountAccess.CheckAsync(user.Id, cancellationToken);

        if (!access.Allowed)
        {
            var denied = BadRequest<JwtAuthResult>(access.Message);
            denied.Code = access.Code;
            return denied;
        }

        //Generate Token
        var result = (await _mediator.Send(
            new GenerateRefreshTokenCommand() { User = user })).Data;

        //return Token 
        return Success(result, "تم تسجيل الدخل بنجاح");
    }
    public async Task<Response<string>> Handle(LogoutCommand request, CancellationToken cancellationToken)
    {
        try
        {
            await _signInManager.SignOutAsync();
            return new Response<string>() { Message = "Success Logout" };
        }
        catch (Exception)
        {
            return BadRequest<string>("Failed Logout");

            throw;
        }
    }

    #endregion
}

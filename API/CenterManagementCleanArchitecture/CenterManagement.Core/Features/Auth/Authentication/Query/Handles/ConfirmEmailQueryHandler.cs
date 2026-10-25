using CenterManagement.Core.Features.Auth.Authentication.Query.Models;

namespace CenterManagement.Core.Features.Auth.Authentication.Query.Handles;

public class ConfirmEmailQueryHandler : ResponseHandler,
    IRequestHandler<ConfirmEmailQuery, Response<string>>
{


    #region Fields
    private readonly IStringLocalizer<SharedResources> _stringLocalizer;
    private readonly UserManager<User> _userManager;
    private readonly IMediator _mediator;

    #endregion

    #region Constructors
    public ConfirmEmailQueryHandler(IStringLocalizer<SharedResources> stringLocalizer,
                                        UserManager<User> userManager,
                                        IMediator mediator) : base(stringLocalizer)
    {
        _stringLocalizer = stringLocalizer;
        _userManager = userManager;
        _mediator = mediator;
    }


    #endregion

    #region Handle Functions

    #region Confirm Email 
    public async Task<Response<string>> Handle(ConfirmEmailQuery request, CancellationToken cancellationToken)
    {
        var encryptedUserId = request.UserId;
        var encryptedCode = request.Code;

        if (string.IsNullOrEmpty(encryptedUserId) || string.IsNullOrEmpty(encryptedCode))
            return BadRequest<string>(_stringLocalizer[SharedResourcesKeys.ErrorWhenConfirmEmail]);

        var userId = (await _mediator.Send(new DecryptionProviderCommand
        {
            Data = encryptedUserId
        })).Data;

        var code = (await _mediator.Send(new DecryptionProviderCommand
        {
            Data = encryptedCode
        })).Data;

        var user = await _userManager.FindByIdAsync(userId);

        if (user == null)
            return BadRequest<string>(_stringLocalizer[SharedResourcesKeys.UserIsNotFound]);

        var confirmEmail = await _userManager.ConfirmEmailAsync(user, code);

        if (!confirmEmail.Succeeded)
            return BadRequest<string>(_stringLocalizer[SharedResourcesKeys.ErrorWhenConfirmEmail]);
        return Success<string>(_stringLocalizer[SharedResourcesKeys.ConfirmEmailDone]);
    }

    #endregion


    #endregion
}


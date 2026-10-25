using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Text;
using CenterManagement.Core.Features.Auth.RefreshTokenFeature.Query.Models;

namespace CenterManagement.Core.Features.Auth.RefreshTokenFeature.Query.Handles;

public class RefreshTokenQueryHandler : ResponseHandler,
    IRequestHandler<ValidateAccessTokenQuery, Response<string>>
{


    #region Fields
    private readonly IStringLocalizer<SharedResources> _stringLocalizer;
    private readonly UserManager<User> _userManager;
    private readonly IMediator _mediator;
    private readonly JwtSettings _jwtSettings;

    #endregion

    #region Constructors
    public RefreshTokenQueryHandler(IStringLocalizer<SharedResources> stringLocalizer,
                                        UserManager<User> userManager,
                                        IMediator mediator,
                                        JwtSettings jwtSettings) : base(stringLocalizer)
    {
        _stringLocalizer = stringLocalizer;
        _userManager = userManager;
        _mediator = mediator;
        _jwtSettings = jwtSettings;
    }


    #endregion

    #region Handle Functions
    public async Task<Response<string>> Handle(ValidateAccessTokenQuery request, CancellationToken cancellationToken)
    {
        var result = await ValidateToken(request.AccessToken);
        if (result == "NotExpired")
            return Success(result);
        return Unauthorized<string>(_stringLocalizer[SharedResourcesKeys.TokenIsExpired]);
    }
    public async Task<string> ValidateToken(string accessToken)
    {
        var handler = new JwtSecurityTokenHandler();
        var parameters = new TokenValidationParameters
        {
            ValidateIssuer = _jwtSettings.ValidateIssuer,
            ValidIssuers = new[] { _jwtSettings.Issuer },
            ValidateIssuerSigningKey = _jwtSettings.ValidateIssuerSigningKey,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.ASCII.GetBytes(_jwtSettings.Secret)),
            ValidAudience = _jwtSettings.Audience,
            ValidateAudience = _jwtSettings.ValidateAudience,
            ValidateLifetime = _jwtSettings.ValidateLifeTime,
        };
        try
        {
            var validator = handler.ValidateToken(accessToken, parameters, out SecurityToken validatedToken);

            if (validator == null)
            {
                return "InvalidToken";
            }

            return "NotExpired";
        }
        catch (Exception ex)
        {
            return ex.Message;
        }
    }
    #endregion
}


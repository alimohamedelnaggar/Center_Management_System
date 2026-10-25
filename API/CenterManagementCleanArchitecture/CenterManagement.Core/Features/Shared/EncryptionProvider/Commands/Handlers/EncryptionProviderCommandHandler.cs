using System.Web;

namespace CenterManagement.Core.Features.Shared.EncryptionProvider.Commands.Handlers;

public class EncryptionProviderCommandHandler :
    ResponseHandler,
    IRequestHandler<EncryptionProviderCommand, Response<string>>,
    IRequestHandler<DecryptionProviderCommand, Response<string>>
{
    #region Fields
    private readonly IStringLocalizer<SharedResources> _stringLocalizer;
    private readonly IDataProtector _protector;

    #endregion

    #region Constructors
    public EncryptionProviderCommandHandler(IStringLocalizer<SharedResources> stringLocalizer,
        IDataProtectionProvider dataProtectionProvider) : base(stringLocalizer)
    {
        _stringLocalizer = stringLocalizer;
        _protector = dataProtectionProvider.CreateProtector("CenterManagementSecureKeyCenterManagementSecureKey");
    }
    #endregion

    #region Handle Functions
    public async Task<Response<string>> Handle(EncryptionProviderCommand request, CancellationToken cancellationToken)
    {

        var protectiobData = HttpUtility.UrlEncode(_protector.Protect(request.Data));
        if (protectiobData is not null)
            return Success<string>(protectiobData);

        return BadRequest<string>("error");
    }

    public async Task<Response<string>> Handle(
        DecryptionProviderCommand request,
        CancellationToken cancellationToken)
    {
        try
        {
            var decodedData =
                HttpUtility.UrlDecode(request.Data);

            var unprotectedData =
                _protector.Unprotect(decodedData);

            return Success<string>(unprotectedData);
        }
        catch (Exception)
        {
            return BadRequest<string>("error");
        }
    }

    #endregion
}

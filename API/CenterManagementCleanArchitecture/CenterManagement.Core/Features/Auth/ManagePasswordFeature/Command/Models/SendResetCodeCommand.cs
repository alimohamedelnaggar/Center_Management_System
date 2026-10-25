namespace CenterManagement.Core.Features.Auth.ManagePasswordFeature.Command.Models
{
    /// <summary>
    /// Requests an out-of-band password-reset code for the account that owns
    /// <see cref="PhoneNumber"/>. The response is deliberately identical whether
    /// or not the account exists.
    /// </summary>
    public class SendResetCodeCommand : IRequest<Response<string>>
    {
        public string PhoneNumber { get; set; }
    }
}

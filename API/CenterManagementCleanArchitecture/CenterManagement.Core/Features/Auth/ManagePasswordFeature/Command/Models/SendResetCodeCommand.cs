namespace CenterManagement.Core.Features.Auth.ManagePasswordFeature.Command.Models
{
    /// <summary>
    /// Requests an out-of-band password-reset code for the account identified by
    /// an email address or a phone number. The response is deliberately identical
    /// whether or not the account exists, has an email, or is allowed to recover.
    /// <see cref="PhoneNumber"/> is the legacy alias of <see cref="Identifier"/>.
    /// </summary>
    public class SendResetCodeCommand : IRequest<Response<string>>
    {
        public string? Identifier { get; set; }
        public string? PhoneNumber { get; set; }
    }
}

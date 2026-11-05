namespace CenterManagement.Core.Features.Auth.ManagePasswordFeature.Command.Models
{
    public class ResetPasswordCommand : IRequest<Response<string>>
    {
        /// <summary>Email address or phone number. <see cref="PhoneNumber"/> is the legacy alias.</summary>
        public string? Identifier { get; set; }
        public string? PhoneNumber { get; set; }
        public string Code { get; set; }
        public string Password { get; set; }
        public string ConfirmPassword { get; set; }
    }
}

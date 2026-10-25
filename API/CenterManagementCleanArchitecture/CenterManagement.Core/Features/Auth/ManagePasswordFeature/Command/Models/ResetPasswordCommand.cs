namespace CenterManagement.Core.Features.Auth.ManagePasswordFeature.Command.Models
{
    public class ResetPasswordCommand : IRequest<Response<string>>
    {
        public string PhoneNumber { get; set; }
        public string Code { get; set; }
        public string Password { get; set; }
        public string ConfirmPassword { get; set; }
    }
}

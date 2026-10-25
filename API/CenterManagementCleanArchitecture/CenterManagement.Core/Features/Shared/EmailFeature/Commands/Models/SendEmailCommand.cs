namespace CenterManagement.Core.Features.Shared.EmailFeature.Commands.Models;

public class SendEmailCommand : IRequest<Response<string>>
{
    public string Email { get; set; }
    public string Message { get; set; }
    public string Subject { get; set; }

}

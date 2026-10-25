namespace CenterManagement.Core.Features.Auth.Authentication.Query.Models;

public class ConfirmEmailQuery : IRequest<Response<string>>
{
    public string UserId { get; set; } = string.Empty;
    public string Code { get; set; }
}

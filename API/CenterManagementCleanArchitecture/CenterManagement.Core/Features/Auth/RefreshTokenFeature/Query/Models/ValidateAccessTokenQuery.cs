namespace CenterManagement.Core.Features.Auth.RefreshTokenFeature.Query.Models;

public class ValidateAccessTokenQuery : IRequest<Response<string>>
{
    public string AccessToken { get; set; }
}
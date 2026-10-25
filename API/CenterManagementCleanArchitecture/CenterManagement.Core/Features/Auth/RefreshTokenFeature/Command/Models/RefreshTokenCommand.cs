namespace CenterManagement.Core.Features.Auth.RefreshTokenFeature.Command.Models;

public class RefreshTokenCommand : IRequest<Response<JwtAuthResult>>
{
    public string AccessToken { get; set; }
    public string RefreshToken { get; set; }
}
public class GenerateRefreshTokenCommand : IRequest<Response<JwtAuthResult>>
{
    public User User { get; set; }
}

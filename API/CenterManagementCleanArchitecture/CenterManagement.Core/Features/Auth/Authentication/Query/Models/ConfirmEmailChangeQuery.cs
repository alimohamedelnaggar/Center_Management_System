namespace CenterManagement.Core.Features.Auth.Authentication.Query.Models;

/// <summary>
/// Confirms a staged self-service email change. The token is bound by Identity
/// to both the account and the pending address, so it cannot confirm any other
/// address and it cannot be reused after the address changes.
/// </summary>
public class ConfirmEmailChangeQuery : IRequest<Response<string>>
{
    public string UserId { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Token { get; set; } = string.Empty;
}

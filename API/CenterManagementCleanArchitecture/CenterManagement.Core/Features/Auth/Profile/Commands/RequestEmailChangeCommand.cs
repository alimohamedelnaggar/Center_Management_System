namespace CenterManagement.Core.Features.Auth.Profile.Command.Models;

/// <summary>
/// Stages a new email address for the signed-in staff account. The current
/// address stays active until the account holder confirms the new one.
/// </summary>
public class RequestEmailChangeCommand : IRequest<Response<string>>
{
    public string Email { get; set; } = string.Empty;
}

namespace CenterManagement.Core.Features.Auth.CurrentUserFeature.Queries.Results;

public class UserResponse
{
    public string FullName { get; set; }
    public string Email { get; set; }
    public string? Address { get; set; }
    public string? Country { get; set; }
}

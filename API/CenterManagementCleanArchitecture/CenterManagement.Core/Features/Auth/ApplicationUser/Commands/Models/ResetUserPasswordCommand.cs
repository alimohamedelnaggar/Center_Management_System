using CenterManagement.Core.Bases;
using MediatR;

namespace CenterManagement.Core.Features.Auth.ApplicationUser.Commands.Models;

/// <summary>
/// SuperAdmin resets a user's password to a freshly generated temporary one.
/// The password is returned once and the user is forced to change it on the
/// next sign-in.
/// </summary>
public class ResetUserPasswordCommand : IRequest<Response<ResetUserPasswordResult>>
{
    public Guid UserId { get; set; }
}

public class ResetUserPasswordResult
{
    public Guid UserId { get; set; }
    public string? PhoneNumber { get; set; }
    public string TemporaryPassword { get; set; } = default!;
    public bool MustChangePassword { get; set; } = true;
}

using CenterManagement.Core.Bases;
using MediatR;

namespace CenterManagement.Core.Features.Auth.Profile.Command.Models;

/// <summary>
/// Lets a teacher set the subject on his own teacher profile. Used by the
/// profile screen to fill in a missing subject without admin involvement.
/// </summary>
public class UpdateMySubjectCommand : IRequest<Response<string>>
{
    public string Subject { get; set; } = string.Empty;
}

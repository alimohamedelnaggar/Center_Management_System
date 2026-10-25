using CenterManagement.Core.Bases;
using MediatR;

namespace CenterManagement.Core.Features.UsersFeature.Students.Commands.Models;

/// <summary>
/// Resets a student's login password to a freshly generated temporary one.
/// Allowed for center admins (whole center) and for a teacher/assistant only
/// when the student is inside their scope. The password is returned once and
/// the student is forced to change it at next sign-in.
/// </summary>
public class ResetStudentPasswordCommand : IRequest<Response<StudentAccountCredential>>
{
    public Guid StudentId { get; set; }
}

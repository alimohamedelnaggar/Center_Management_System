using CenterManagement.Core.Features.ParentPortalFeature.Dtos;

namespace CenterManagement.Core.Features.ParentPortalFeature.Commands.Models;

/// <summary>
/// Creates (or reuses) a parent login account for the parent phone registered on
/// the given student, then links the student to that account. Issued from the
/// student page by center staff.
/// </summary>
public class CreateParentAccountCommand : IRequest<Response<CreateParentAccountResult>>
{
    public Guid StudentId { get; set; }
}

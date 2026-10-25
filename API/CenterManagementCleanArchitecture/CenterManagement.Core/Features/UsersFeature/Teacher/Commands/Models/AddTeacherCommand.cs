namespace CenterManagement.Core.Features.UsersFeature.Teacher.Commands.Models;

public class AddTeacherCommand : IRequest<Response<string>>
{
    /// <summary>Optional target center for privileged callers (Admin/SuperAdmin).</summary>
    public Guid? CenterId { get; set; }

    public string FullName { get; set; } = default!;
    public string PhoneNumber { get; set; } = default!;
    public string Password { get; set; } = default!;
    public string ConfirmPassword { get; set; } = default!;

    /// <summary>Subject/material taught by the teacher (optional).</summary>
    public string? Subject { get; set; }

    /// <summary>Groups the teacher is assigned to inside the center.</summary>
    public List<Guid>? GroupIds { get; set; }
}

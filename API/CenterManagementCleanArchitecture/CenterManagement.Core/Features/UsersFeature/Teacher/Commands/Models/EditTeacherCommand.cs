namespace CenterManagement.Core.Features.UsersFeature.Teacher.Commands.Models;

public class EditTeacherCommand : IRequest<Response<string>>
{
    public Guid Id { get; set; }
    public string FullName { get; set; } = default!;
    public string? PhoneNumber { get; set; }

    /// <summary>Subject/material taught by the teacher (optional).</summary>
    public string? Subject { get; set; }

    /// <summary>Replaces the teacher's group assignments when provided.</summary>
    public List<Guid>? GroupIds { get; set; }
}

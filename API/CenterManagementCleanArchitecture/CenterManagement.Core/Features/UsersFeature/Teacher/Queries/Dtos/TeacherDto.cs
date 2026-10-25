namespace CenterManagement.Core.Features.UsersFeature.Teacher.Queries.Dtos;

public class TeacherDto
{
    public Guid Id { get; set; }
    public string FullName { get; set; } = default!;
    public string? PhoneNumber { get; set; }
    public Guid? CenterId { get; set; }
    public DateTime CreatedAt { get; set; }
    public string? Subject { get; set; }
    public List<TeacherGroupDto> Groups { get; set; } = [];
}

public class TeacherGroupDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = default!;
}

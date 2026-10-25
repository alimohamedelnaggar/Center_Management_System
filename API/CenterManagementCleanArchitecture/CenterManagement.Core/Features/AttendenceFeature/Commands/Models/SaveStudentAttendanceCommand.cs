namespace CenterManagement.Core.Features.AttendenceFeature.Commands.Models;

public record SaveStudentAttendanceCommand : IRequest<Response<string>>
{
    public Guid SessionId { get; init; }
    public DateOnly AttendanceDate { get; set; }
    public List<AttendanceItemDto> Attendances { get; init; } = [];
}

public record AttendanceItemDto
{
    public Guid StudentId { get; init; }
    public AttendanceStatus Status { get; init; } = AttendanceStatus.Present;
    public string? Notes { get; init; }
}

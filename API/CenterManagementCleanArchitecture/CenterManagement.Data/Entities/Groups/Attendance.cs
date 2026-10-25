using CenterManagement.Data.Entities.Users;

namespace CenterManagement.Data.Entities.Groups;

public class Attendance : ITenantEntity
{
    public Guid StudentId { get; set; }
    public Student Student { get; set; } = default!;

    public Guid SessionId { get; set; }
    public Session Session { get; set; } = default!;

    public DateOnly AttendanceDate { get; set; }
    public AttendanceStatus Status { get; set; }

    public string? Notes { get; set; }

    public AttendanceSource Source { get; set; } = AttendanceSource.Manual;

    public DateTime? RecordedAt { get; set; }

    public Guid? RecordedBy { get; set; }

    public Guid? CenterId { get; set; }
}
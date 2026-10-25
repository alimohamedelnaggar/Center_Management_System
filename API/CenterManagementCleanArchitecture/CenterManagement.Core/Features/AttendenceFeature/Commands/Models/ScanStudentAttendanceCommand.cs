namespace CenterManagement.Core.Features.AttendenceFeature.Commands.Models;

public record ScanStudentAttendanceCommand : IRequest<Response<ScanAttendanceResultDTO>>
{
    public string Code { get; set; } = string.Empty;

    public Guid SessionId { get; set; }

    public DateOnly AttendanceDate { get; set; }
}

public record ScanAttendanceResultDTO
{
    public Guid StudentId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string QrCode { get; set; } = string.Empty;

    public Guid GroupId { get; set; }
    public string GroupName { get; set; } = string.Empty;

    public Guid SessionId { get; set; }
    public AttendanceStatus Status { get; set; }

    public AttendanceSource Source { get; set; }

    public DateTime? RecordedAt { get; set; }

    // true when the scan matched an attendance row that was already recorded
    // as present by a scan, so nothing was written this time.
    public bool AlreadyRecorded { get; set; }
}
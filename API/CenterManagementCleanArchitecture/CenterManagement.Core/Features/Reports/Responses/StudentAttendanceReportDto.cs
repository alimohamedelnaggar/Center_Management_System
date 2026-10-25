public sealed class StudentAttendanceReportDto
{
    public Guid StudentId { get; set; }

    public string StudentName { get; set; } = string.Empty;

    public string GroupName { get; set; } = string.Empty;

    public int TotalSessions { get; set; }

    public int PresentCount { get; set; }

    public int AbsentCount { get; set; }

    public decimal AttendancePercentage { get; set; }

    public List<AttendanceRecordDto> Records { get; set; } = [];
}
public sealed class AttendanceRecordDto
{
    public DateOnly AttendanceDate { get; set; }

    public AttendanceStatus Status { get; set; }

    public DayOfWeek DayOfWeek { get; set; }

    public TimeOnly StartTime { get; set; }

    public TimeOnly EndTime { get; set; }

    public string? Notes { get; set; }
}
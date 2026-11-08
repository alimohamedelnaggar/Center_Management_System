namespace CenterManagement.Data.Results;

public class StudentStatsResult
{
    public int TotalStudents { get; set; }
    public int ActiveStudents { get; set; }
    public int InactiveStudents { get; set; }
    public int NewStudentsThisMonth { get; set; }
}
public class AttendanceStatsDTO
{
    public int PresentToday { get; set; }

    public int AbsentToday { get; set; }

    public int LateToday { get; set; }

    public int ExcusedToday { get; set; }

    public int TotalToday { get; set; }

    public int PresentThisMonth { get; set; }

    public int AbsentThisMonth { get; set; }

    public int LateThisMonth { get; set; }

    public int ExcusedThisMonth { get; set; }

    public int TotalThisMonth { get; set; }

    /// <summary>(Present + Late) / (Total - Excused); null when nothing is countable.</summary>
    public double? AttendanceRate { get; set; }
}
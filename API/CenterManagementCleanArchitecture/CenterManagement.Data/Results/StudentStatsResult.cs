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

    public int PresentThisMonth { get; set; }

    public double AttendanceRate { get; set; }
}
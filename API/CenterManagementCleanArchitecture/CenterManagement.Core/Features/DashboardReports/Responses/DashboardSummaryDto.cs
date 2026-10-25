public class DashboardSummaryDto
{
    // Students (core)
    public int TotalStudents { get; set; }

    public int ActiveStudents { get; set; }
    public int InactiveStudents { get; set; }
    public int DeletedStudents { get; set; }
    public int MonthlyStudents { get; set; }
    public int MonthlyDeletedStudents { get; set; }

    public int NetStudentGrowth { get; set; }

    // Groups (core)
    public int TotalGroups { get; set; }

    // Finance (payments for revenue, accounting for expenses/salaries).
    // Null when the matching module is disabled for the center, so the UI can
    // omit the section instead of showing a misleading zero.
    public decimal? MonthlyRevenue { get; set; }

    public decimal? PreviousMonthRevenue { get; set; }

    public decimal? MonthlyExpenses { get; set; }

    public decimal? PreviousMonthExpenses { get; set; }

    public decimal? NetProfit { get; set; }

    public decimal? MonthlyAssistantSalaries { get; set; }

    public decimal? PreviousMonthAssistantSalaries { get; set; }

    // Attendance (null when the attendance module is disabled).
    public int? MonthlyPresentCount { get; set; }

    public int? MonthlyAbsentCount { get; set; }

    public double? AttendancePercentage { get; set; }
}

public sealed class ReportsOverviewDto
{
    public string Role { get; set; } = string.Empty;

    public int Year { get; set; }

    public int Month { get; set; }

    // People
    public int? StudentsCount { get; set; }

    public int? ActiveStudentsCount { get; set; }

    public int? InactiveStudentsCount { get; set; }

    public int? GroupsCount { get; set; }

    public int? TeachersCount { get; set; }

    public int? AssistantsCount { get; set; }

    public int? SessionsCount { get; set; }

    // Attendance
    public int? PresentCount { get; set; }

    public int? AbsentCount { get; set; }

    public int? LateCount { get; set; }

    public int? ExcusedCount { get; set; }

    public int? TotalCount { get; set; }

    /// <summary>(Present + Late) / (Total - Excused); null when not countable.</summary>
    public double? AttendancePercentage { get; set; }

    // Finance
    public decimal? MonthlyRevenue { get; set; }

    public decimal? MonthlyExpenses { get; set; }

    public decimal? NetProfit { get; set; }

    public decimal? MonthlyAssistantSalaries { get; set; }
}

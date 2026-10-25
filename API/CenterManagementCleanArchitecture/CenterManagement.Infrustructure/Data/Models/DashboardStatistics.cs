public class DashboardStatistics
{
    public int TotalStudents { get; set; }

    public int ActiveStudents { get; set; }
    public int InactiveStudents { get; set; }
    public int DeletedStudents { get; set; }
    public int MonthlyStudents { get; set; }

    public int MonthlyDeletedStudents { get; set; }

    public int NetStudentGrowth { get; set; }

    public int TotalGroups { get; set; }

    public decimal MonthlyRevenue { get; set; }

    public decimal PreviousMonthRevenue { get; set; }

    public decimal MonthlyExpenses { get; set; }

    public decimal PreviousMonthExpenses { get; set; }

    public decimal NetProfit { get; set; }

    public decimal MonthlyAssistantSalaries { get; set; }

    public decimal PreviousMonthAssistantSalaries { get; set; }

    public int MonthlyPresentCount { get; set; }

    public int MonthlyAbsentCount { get; set; }

    public double AttendancePercentage { get; set; }

}
namespace CenterManagement.Core.Features.Reports.Queries.GetCenterReports
{
    /// <summary>
    /// Center-wide report payload. Finance / attendance / per-teacher collected
    /// and the trend are for the (<see cref="From"/>, <see cref="To"/>) range;
    /// the per-group expected / collected / outstanding are for the selected
    /// <see cref="BillingPeriod"/> month.
    /// </summary>
    public sealed class CenterReportsDto
    {
        public string Role { get; set; } = string.Empty;

        /// <summary>"SoloTeacher" / "MultiTeacher" so the client hides the
        /// per-teacher breakdown for a solo center.</summary>
        public string CenterType { get; set; } = string.Empty;

        /// <summary>Subject of the solo center's single teacher, shown in place
        /// of the teacher column; null for multi centers.</summary>
        public string? SoloTeacherSubject { get; set; }

        public DateOnly From { get; set; }

        /// <summary>Exclusive upper bound of the range.</summary>
        public DateOnly To { get; set; }

        public DateOnly BillingPeriod { get; set; }

        public CenterReportTotalsDto Totals { get; set; } = new();

        public CenterReportFinanceDto Finance { get; set; } = new();

        public List<CenterReportTeacherDto> Teachers { get; set; } = new();

        public List<CenterReportGroupDto> Groups { get; set; } = new();

        public List<CenterReportTrendPointDto> Trend { get; set; } = new();
    }

    public sealed class CenterReportTotalsDto
    {
        public int ActiveStudents { get; set; }

        public int Teachers { get; set; }

        public int Assistants { get; set; }

        public int Groups { get; set; }
    }

    /// <summary>
    /// Finance lines for the range. Each line is reported separately; the trend
    /// uses the operational <see cref="Expenses"/> only.
    /// </summary>
    public sealed class CenterReportFinanceDto
    {
        /// <summary>Student payments collected inside the range.</summary>
        public decimal StudentPaymentsCollected { get; set; }

        /// <summary>Other (manually recorded) incomes inside the range.</summary>
        public decimal OtherIncomes { get; set; }

        public decimal Expenses { get; set; }

        public decimal AssistantSalaries { get; set; }

        /// <summary>
        /// Net = StudentPaymentsCollected + OtherIncomes - Expenses - AssistantSalaries.
        /// </summary>
        public decimal Net { get; set; }
    }

    public sealed class CenterReportTeacherDto
    {
        public Guid TeacherId { get; set; }

        public string TeacherName { get; set; } = string.Empty;

        public int GroupsCount { get; set; }

        public int StudentsCount { get; set; }

        /// <summary>Student payments collected in the range for this teacher's groups.</summary>
        public decimal CollectedInRange { get; set; }

        public double AttendanceRate { get; set; }
    }

    public sealed class CenterReportGroupDto
    {
        public Guid GroupId { get; set; }

        public string GroupName { get; set; } = string.Empty;

        public string TeacherName { get; set; } = string.Empty;

        public int StudentsCount { get; set; }

        public double AttendanceRate { get; set; }

        /// <summary>Expected for the billing month (sum of dues).</summary>
        public decimal Expected { get; set; }

        /// <summary>Collected for the billing month (sum of paid).</summary>
        public decimal Collected { get; set; }

        /// <summary>Outstanding for the billing month (sum of remaining).</summary>
        public decimal Outstanding { get; set; }
    }

    public sealed class CenterReportTrendPointDto
    {
        public int Year { get; set; }

        public int Month { get; set; }

        /// <summary>Student payments + other incomes for the month.</summary>
        public decimal Income { get; set; }

        public decimal Expenses { get; set; }
    }
}

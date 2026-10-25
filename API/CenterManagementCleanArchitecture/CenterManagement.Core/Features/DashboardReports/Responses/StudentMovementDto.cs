namespace CenterManagement.Core.Features.DashboardReports.Responses;

public class StudentMovementDto
{
    public int Month { get; set; }

    public string MonthName { get; set; } = default!;

    public int NewStudents { get; set; }

    public int DepartedStudents { get; set; }

    public int NetGrowth { get; set; }
}
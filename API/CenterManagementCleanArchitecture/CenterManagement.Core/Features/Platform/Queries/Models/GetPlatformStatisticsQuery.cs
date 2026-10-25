using CenterManagement.Core.Bases;
using MediatR;

namespace CenterManagement.Core.Features.Platform.Queries.Models;

/// <summary>High-level platform KPIs for the SuperAdmin dashboard.</summary>
public class GetPlatformStatisticsQuery : IRequest<Response<PlatformStatisticsDto>>
{
}

public class PlatformStatisticsDto
{
    public int TotalCenters { get; set; }
    public int ActiveCenters { get; set; }
    public int SuspendedCenters { get; set; }
    public int ExpiredCenters { get; set; }
    public int SoloTeacherCenters { get; set; }
    public int MultiTeacherCenters { get; set; }
    public int CentersCreatedThisMonth { get; set; }

    public int TotalUsers { get; set; }
    public int TotalOwners { get; set; }
    public int TotalTeachers { get; set; }
    public int TotalAssistants { get; set; }
    public int TotalStudents { get; set; }

    public int TotalGroups { get; set; }
    public int ActiveSubscriptions { get; set; }

    /// <summary>Count of centers grouped by their current subscription plan type.</summary>
    public List<SubscriptionTypeCountDto> SubscriptionsByType { get; set; } = [];

    /// <summary>Centers currently inside their grace window.</summary>
    public int CentersInGrace { get; set; }

    /// <summary>Total subscription-payment revenue recorded in the current month.</summary>
    public decimal MonthlyRevenue { get; set; }

    /// <summary>Subscription-payment revenue per month for the current year.</summary>
    public List<MonthlyRevenueDto> RevenueByMonth { get; set; } = [];
}

public class SubscriptionTypeCountDto
{
    public string Type { get; set; } = default!;
    public string Label { get; set; } = default!;
    public int Count { get; set; }
}

public class MonthlyRevenueDto
{
    public int Month { get; set; }
    public decimal Revenue { get; set; }
}

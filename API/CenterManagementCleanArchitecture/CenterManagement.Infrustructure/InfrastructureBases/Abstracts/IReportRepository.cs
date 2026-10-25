using CenterManagement.Infrustructure.Data.Models;
using System;
using System.Collections.Generic;
using System.Text;

namespace CenterManagement.Infrustructure.InfrastructureBases.Abstracts
{
    public interface IReportRepository
    {
        Task<DashboardStatistics> GetDashboardStatisticsAsync(int year,
      int month,
            CancellationToken cancellationToken = default);

        Task<List<StudentDistributionModel>> GetStudentDistributionAsync(
    CancellationToken cancellationToken = default);

        Task<List<RevenueChartModel>> GetRevenueChartAsync(
    int year,
    CancellationToken cancellationToken = default);

        Task<List<AttendanceChartModel>> GetAttendanceChartAsync(
    CancellationToken cancellationToken = default);

        Task<List<TopGroupModel>> GetTopGroupsAsync(
    int take = 5,
    CancellationToken cancellationToken = default);

        Task<List<RecentActivityModel>> GetRecentActivityAsync(
    int take = 10,
    CancellationToken cancellationToken = default);

        Task<List<StudentMovementModel>> GetStudentMovementAsync(
    int year,
    CancellationToken cancellationToken = default);
    }
}

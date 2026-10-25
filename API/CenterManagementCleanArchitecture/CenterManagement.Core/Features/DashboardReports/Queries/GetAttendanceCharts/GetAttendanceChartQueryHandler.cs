using CenterManagement.Core.Bases;
using CenterManagement.Core.Features.DashboardReports.Queries.GetAttendanceCharts;
using CenterManagement.Core.Features.DashboardReports.Responses;
using CenterManagement.Infrustructure.InfrastructureBases.Abstracts;
using CenterManagement.Infrustructure.InfrastructureBases.Bases;
using MediatR;

namespace CenterManagement.Core.Features.Reports.AttendanceChart.Queries.Handlers;

public class GetAttendanceChartQueryHandler
    : ResponseHandler,
      IRequestHandler<GetAttendanceChartQuery, Response<List<AttendanceChartDto>>>
{
    private readonly IRepositoryManager repositoryManager;

    public GetAttendanceChartQueryHandler(
        IRepositoryManager repositoryManager,
        IStringLocalizer<SharedResources> localizer)
        : base(localizer)
    {
        
        this.repositoryManager = repositoryManager;
    }

    public async Task<Response<List<AttendanceChartDto>>> Handle(
        GetAttendanceChartQuery request,
        CancellationToken cancellationToken)
    {
        var result = await repositoryManager.ReportRepository
            .GetAttendanceChartAsync(cancellationToken);

        var dto = result.Select(x => new AttendanceChartDto
        {
            DayName = GetArabicDayName(x.DayOfWeek),
            AttendanceRate = x.AttendanceRate
        }).ToList();

        return Success(dto);
    }

    private static string GetArabicDayName(DayOfWeek day) => day switch
    {
        DayOfWeek.Saturday => "السبت",
        DayOfWeek.Sunday => "الأحد",
        DayOfWeek.Monday => "الإثنين",
        DayOfWeek.Tuesday => "الثلاثاء",
        DayOfWeek.Wednesday => "الأربعاء",
        DayOfWeek.Thursday => "الخميس",
        DayOfWeek.Friday => "الجمعة",
        _ => string.Empty
    };
}
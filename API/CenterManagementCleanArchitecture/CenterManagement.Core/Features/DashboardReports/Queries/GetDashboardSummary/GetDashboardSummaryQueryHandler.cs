using CenterManagement.Data.AppMetaData;
using CenterManagement.Data.Entities.Abstractions;
using CenterManagement.Infrustructure.InfrastructureBases.Abstracts;
using CenterManagement.Infrustructure.InfrastructureBases.Bases;

public class GetDashboardSummaryQueryHandler
    : ResponseHandler,
      IRequestHandler<GetDashboardSummaryQuery, Response<DashboardSummaryDto>>
{
    private readonly IRepositoryManager repositoryManager;
    private readonly ICenterModuleService _centerModules;
    private readonly ITenantContext _tenantContext;

    public GetDashboardSummaryQueryHandler(
        IRepositoryManager repositoryManager,
        ICenterModuleService centerModules,
        ITenantContext tenantContext,
        IStringLocalizer<SharedResources> localizer)
        : base(localizer)
    {
        this.repositoryManager = repositoryManager;
        _centerModules = centerModules;
        _tenantContext = tenantContext;
    }

    public async Task<Response<DashboardSummaryDto>> Handle(
        GetDashboardSummaryQuery request,
        CancellationToken cancellationToken)
    {
        var statistics = await repositoryManager.ReportRepository
            .GetDashboardStatisticsAsync(
                request.Year,
                request.Month,
                cancellationToken);

        var (payments, accounting, attendance) = await ResolveModulesAsync(cancellationToken);

        var dto = new DashboardSummaryDto
        {
            // Core
            TotalStudents = statistics.TotalStudents,
            ActiveStudents = statistics.ActiveStudents,
            InactiveStudents = statistics.InactiveStudents,
            TotalGroups = statistics.TotalGroups,
            MonthlyStudents = statistics.MonthlyStudents,
            DeletedStudents = statistics.DeletedStudents,
            MonthlyDeletedStudents = statistics.MonthlyDeletedStudents,
            NetStudentGrowth = statistics.NetStudentGrowth,

            // Revenue belongs to payments; expenses/salaries/profit to accounting.
            MonthlyRevenue = payments ? statistics.MonthlyRevenue : null,
            PreviousMonthRevenue = payments ? statistics.PreviousMonthRevenue : null,
            MonthlyExpenses = accounting ? statistics.MonthlyExpenses : null,
            PreviousMonthExpenses = accounting ? statistics.PreviousMonthExpenses : null,
            MonthlyAssistantSalaries = accounting ? statistics.MonthlyAssistantSalaries : null,
            PreviousMonthAssistantSalaries = accounting ? statistics.PreviousMonthAssistantSalaries : null,
            NetProfit = payments && accounting ? statistics.NetProfit : null,

            // Attendance
            MonthlyPresentCount = attendance ? statistics.MonthlyPresentCount : null,
            MonthlyAbsentCount = attendance ? statistics.MonthlyAbsentCount : null,
            AttendancePercentage = attendance ? statistics.AttendancePercentage : null
        };

        return Success(dto);
    }

    private async Task<(bool Payments, bool Accounting, bool Attendance)> ResolveModulesAsync(
        CancellationToken cancellationToken)
    {
        var centerId = _tenantContext.CenterId;

        // Platform users (no center) see everything.
        if (centerId is null)
            return (true, true, true);

        var payments = await _centerModules.IsEnabledAsync(centerId.Value, ModuleKeys.Payments, cancellationToken);
        var accounting = await _centerModules.IsEnabledAsync(centerId.Value, ModuleKeys.Accounting, cancellationToken);
        var attendance = await _centerModules.IsEnabledAsync(centerId.Value, ModuleKeys.Attendance, cancellationToken);

        return (payments, accounting, attendance);
    }
}

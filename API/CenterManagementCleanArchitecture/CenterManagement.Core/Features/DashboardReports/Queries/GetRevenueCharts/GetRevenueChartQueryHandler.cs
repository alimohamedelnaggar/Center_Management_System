using CenterManagement.Core.Features.DashboardReports.Queries.GetRevenueCharts;
using CenterManagement.Core.Features.DashboardReports.Responses;
using CenterManagement.Data.AppMetaData;
using CenterManagement.Data.Entities.Abstractions;
using CenterManagement.Infrustructure.InfrastructureBases.Bases;

namespace CenterManagement.Core.Features.Reports.RevenueChart.Queries.Handlers;

public class GetRevenueChartQueryHandler
    : ResponseHandler,
      IRequestHandler<GetRevenueChartQuery, Response<List<RevenueChartDto>>>
{
    private readonly IRepositoryManager repositoryManager;
    private readonly ICenterModuleService _centerModules;
    private readonly ITenantContext _tenantContext;

    public GetRevenueChartQueryHandler(
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

    public async Task<Response<List<RevenueChartDto>>> Handle(
        GetRevenueChartQuery request,
        CancellationToken cancellationToken)
    {
        var result = await repositoryManager.ReportRepository
            .GetRevenueChartAsync(
                request.Year ?? DateTime.UtcNow.Year,
                cancellationToken);

        // Revenue is gated by the payments module (controller). Expenses belong to
        // accounting, so zero them out when that module is disabled.
        var accountingEnabled = await IsAccountingEnabledAsync(cancellationToken);

        var months = new[]
        {
            "يناير",
            "فبراير",
            "مارس",
            "أبريل",
            "مايو",
            "يونيو",
            "يوليو",
            "أغسطس",
            "سبتمبر",
            "أكتوبر",
            "نوفمبر",
            "ديسمبر"
        };

        var dto = result.Select(x => new RevenueChartDto
        {
            Month = x.Month,
            MonthName = months[x.Month - 1],
            Revenue = x.Revenue,
            Expenses = accountingEnabled ? x.Expenses : 0
        }).ToList();

        return Success(dto);
    }

    private async Task<bool> IsAccountingEnabledAsync(CancellationToken cancellationToken)
    {
        var centerId = _tenantContext.CenterId;

        if (centerId is null)
            return true;

        return await _centerModules.IsEnabledAsync(centerId.Value, ModuleKeys.Accounting, cancellationToken);
    }
}

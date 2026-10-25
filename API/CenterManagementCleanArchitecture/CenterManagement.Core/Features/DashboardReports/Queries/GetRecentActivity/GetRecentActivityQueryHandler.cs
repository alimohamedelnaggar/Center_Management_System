using CenterManagement.Core.Features.DashboardReports.Responses;
using CenterManagement.Data.AppMetaData;
using CenterManagement.Data.Entities.Abstractions;
using CenterManagement.Infrustructure.Data.Models;
using CenterManagement.Infrustructure.InfrastructureBases.Bases;

namespace CenterManagement.Core.Features.DashboardReports.Queries.GetRecentActivity;

public class GetRecentActivityQueryHandler
    : ResponseHandler,
      IRequestHandler<GetRecentActivityQuery, Response<List<RecentActivityDto>>>
{
    private readonly IRepositoryManager repositoryManager;
    private readonly ICenterModuleService _centerModules;
    private readonly ITenantContext _tenantContext;

    public GetRecentActivityQueryHandler(
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

    public async Task<Response<List<RecentActivityDto>>> Handle(
        GetRecentActivityQuery request,
        CancellationToken cancellationToken)
    {
        var result = await repositoryManager.ReportRepository
            .GetRecentActivityAsync(request.Take, cancellationToken);

        var (payments, accounting, attendance) = await ResolveModulesAsync(cancellationToken);

        var dto = result
            .Where(x => IsVisible(x.ActivityType, payments, accounting, attendance))
            .Select(x => new RecentActivityDto
            {
                ActivityType = x.ActivityType,
                Description = BuildDescription(x),
                RelatedName = x.RelatedName,
                Date = x.Date
            }).ToList();

        return Success(dto);
    }

    private static bool IsVisible(string activityType, bool payments, bool accounting, bool attendance) =>
        activityType switch
        {
            "payment_created" => payments,
            "expense_created" or "income_created" or "assistant_salary" => accounting,
            "attendance_present" or "attendance_absent" => attendance,
            _ => true
        };

    private async Task<(bool Payments, bool Accounting, bool Attendance)> ResolveModulesAsync(
        CancellationToken cancellationToken)
    {
        var centerId = _tenantContext.CenterId;

        if (centerId is null)
            return (true, true, true);

        var payments = await _centerModules.IsEnabledAsync(centerId.Value, ModuleKeys.Payments, cancellationToken);
        var accounting = await _centerModules.IsEnabledAsync(centerId.Value, ModuleKeys.Accounting, cancellationToken);
        var attendance = await _centerModules.IsEnabledAsync(centerId.Value, ModuleKeys.Attendance, cancellationToken);

        return (payments, accounting, attendance);
    }

    private static string BuildDescription(RecentActivityModel activity)
    {
        var name = activity.RelatedName ?? string.Empty;

        var amount = activity.Amount.HasValue
            ? $" بقيمة {activity.Amount:N0} ج.م"
            : string.Empty;

        return activity.ActivityType switch
        {
            "student_added" => $"تسجيل طالب جديد: {name}",
            "student_deleted" => $"حذف طالب: {name}",
            "payment_created" => $"دفعة جديدة لطالب {name}{amount}",
            "expense_created" => $"إضافة مصروف: {name}{amount}",
            "income_created" => $"إضافة إيراد: {name}{amount}",
            "assistant_salary" => $"صرف مرتب مساعد: {name}{amount}",
            "attendance_present" => $"تسجيل حضور طالب: {name}",
            "attendance_absent" => $"تسجيل غياب طالب: {name}",
            _ => name
        };
    }
}

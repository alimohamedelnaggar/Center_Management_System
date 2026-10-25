using CenterManagement.Core.Features.Reports.Queries.GetReportsOverview;
using CenterManagement.Data.AppMetaData;
using CenterManagement.Data.Entities.Abstractions;
using CenterManagement.Data.Enums;
using CenterManagement.Infrustructure.InfrastructureBases.Bases;
using Microsoft.EntityFrameworkCore;

public class GetReportsOverviewQueryHandler
    : ResponseHandler,
      IRequestHandler<GetReportsOverviewQuery, Response<ReportsOverviewDto>>
{
    private readonly IRepositoryManager _repositoryManager;
    private readonly AppDbContext _context;
    private readonly ITenantContext _tenantContext;
    private readonly IUserScopeService _scopeService;
    private readonly ICenterModuleService _centerModules;

    public GetReportsOverviewQueryHandler(
        IRepositoryManager repositoryManager,
        AppDbContext context,
        ITenantContext tenantContext,
        IUserScopeService scopeService,
        ICenterModuleService centerModules,
        IStringLocalizer<SharedResources> localizer)
        : base(localizer)
    {
        _repositoryManager = repositoryManager;
        _context = context;
        _tenantContext = tenantContext;
        _scopeService = scopeService;
        _centerModules = centerModules;
    }

    public async Task<Response<ReportsOverviewDto>> Handle(
        GetReportsOverviewQuery request,
        CancellationToken cancellationToken)
    {
        var now = DateTime.UtcNow;
        var year = request.Year ?? now.Year;
        var month = request.Month ?? now.Month;
        var role = _tenantContext.Role ?? string.Empty;

        var dto = new ReportsOverviewDto
        {
            Role = role,
            Year = year,
            Month = month
        };

        var isAdminLike = role == AppRoles.SuperAdmin;
        var isAssistant = role == AppRoles.Assistant;
        var isTeacher = role == AppRoles.Teacher;
        var isCenterOwner = role == AppRoles.CenterOwner;

        if (isAdminLike || isAssistant)
        {
            var stats = await _repositoryManager.ReportRepository
                .GetDashboardStatisticsAsync(year, month, cancellationToken);

            dto.StudentsCount = stats.TotalStudents;
            dto.ActiveStudentsCount = stats.ActiveStudents;
            dto.InactiveStudentsCount = stats.InactiveStudents;
            dto.GroupsCount = stats.TotalGroups;
            dto.TeachersCount = await CountTeachersAsync(cancellationToken);
            dto.AssistantsCount = await CountAssistantsAsync(cancellationToken);
            dto.SessionsCount = await _context.Sessions
                .CountAsync(x => !x.IsDeleted, cancellationToken);
            dto.PresentCount = stats.MonthlyPresentCount;
            dto.AbsentCount = stats.MonthlyAbsentCount;
            dto.AttendancePercentage = stats.AttendancePercentage;
            dto.MonthlyRevenue = stats.MonthlyRevenue;
            dto.MonthlyExpenses = stats.MonthlyExpenses;
            dto.NetProfit = stats.NetProfit;
            dto.MonthlyAssistantSalaries = stats.MonthlyAssistantSalaries;
        }
        else if (isTeacher)
        {
            var scope = await _scopeService.ResolveAsync(cancellationToken);

            dto.StudentsCount = await _context.Students
                .ScopeToUser(scope)
                .CountAsync(cancellationToken);
            dto.ActiveStudentsCount = await _context.Students
                .ScopeToUser(scope)
                .CountAsync(x => x.IsActive, cancellationToken);
            dto.InactiveStudentsCount =
                (dto.StudentsCount ?? 0) - (dto.ActiveStudentsCount ?? 0);
            dto.GroupsCount = await _context.Groups
                .Where(x => !x.IsDeleted)
                .ScopeToUser(scope)
                .CountAsync(cancellationToken);
            dto.SessionsCount = await _context.Sessions
                .Where(x => !x.IsDeleted)
                .ScopeToUser(scope)
                .CountAsync(cancellationToken);

            await FillAttendanceAsync(dto, year, month, scope, cancellationToken);
        }
        else if (isCenterOwner)
        {
            dto.GroupsCount = await _context.Groups
                .CountAsync(x => !x.IsDeleted, cancellationToken);
            dto.TeachersCount = await CountTeachersAsync(cancellationToken);
            dto.SessionsCount = await _context.Sessions
                .CountAsync(x => !x.IsDeleted, cancellationToken);
        }

        var (payments, accounting, attendance) = await ResolveModulesAsync(cancellationToken);

        if (!attendance)
        {
            dto.PresentCount = null;
            dto.AbsentCount = null;
            dto.AttendancePercentage = null;
        }

        if (!payments)
            dto.MonthlyRevenue = null;

        if (!accounting)
        {
            dto.MonthlyExpenses = null;
            dto.NetProfit = null;
            dto.MonthlyAssistantSalaries = null;
        }

        return Success(dto);
    }

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

    private async Task FillAttendanceAsync(
        ReportsOverviewDto dto,
        int year,
        int month,
        UserScope scope,
        CancellationToken cancellationToken)
    {
        var start = new DateOnly(year, month, 1);
        var end = start.AddMonths(1);

        var stats = await _context.Attendances
            .ScopeToUser(scope)
            .Where(x => x.AttendanceDate >= start && x.AttendanceDate < end)
            .GroupBy(_ => 1)
            .Select(g => new
            {
                Total = g.Count(),
                Present = g.Count(x => x.Status == AttendanceStatus.Present)
            })
            .FirstOrDefaultAsync(cancellationToken);

        var total = stats?.Total ?? 0;
        var present = stats?.Present ?? 0;

        dto.PresentCount = present;
        dto.AbsentCount = total - present;
        dto.AttendancePercentage = total == 0
            ? 0
            : Math.Round((double)present / total * 100, 2);
    }

    private async Task<int> CountTeachersAsync(CancellationToken cancellationToken)
    {
        var roleId = await _context.Roles
            .Where(r => r.Name == AppRoles.Teacher)
            .Select(r => r.Id)
            .FirstOrDefaultAsync(cancellationToken);

        if (roleId == Guid.Empty)
            return 0;

        var query = from user in _context.Users
                    join userRole in _context.UserRoles
                        on user.Id equals userRole.UserId
                    where userRole.RoleId == roleId
                    select user;

        if (!_tenantContext.IsUnrestricted && _tenantContext.CenterId.HasValue)
        {
            var centerId = _tenantContext.CenterId.Value;
            query = query.Where(u => u.CenterId == centerId);
        }

        return await query.CountAsync(cancellationToken);
    }

    private async Task<int> CountAssistantsAsync(CancellationToken cancellationToken)
    {
        if (_tenantContext.IsUnrestricted || !_tenantContext.CenterId.HasValue)
            return await _context.Assistents.CountAsync(cancellationToken);

        var centerId = _tenantContext.CenterId.Value;
        return await _context.Assistents
            .CountAsync(x => x.CenterId == centerId, cancellationToken);
    }
}

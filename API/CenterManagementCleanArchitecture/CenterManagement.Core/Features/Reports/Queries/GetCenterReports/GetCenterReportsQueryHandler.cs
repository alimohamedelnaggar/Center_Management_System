using CenterManagement.Core.Bases;
using CenterManagement.Core.Features.Payments.Shared;
using CenterManagement.Core.Resources;
using CenterManagement.Data.AppMetaData;
using CenterManagement.Data.Entities.Abstractions;
using CenterManagement.Data.Enums;
using CenterManagement.Infrustructure.Data;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Localization;

namespace CenterManagement.Core.Features.Reports.Queries.GetCenterReports;

/// <summary>
/// Center-wide reports for the center owner / solo teacher (policy CenterAdmin).
/// Finance, attendance, the collected-per-teacher column and the trend use the
/// (<see cref="GetCenterReportsQuery.From"/>, <see cref="GetCenterReportsQuery.To"/>)
/// range; the per-group expected / collected / outstanding use the selected
/// billing month and are computed by the shared <see cref="IMonthlyDueService"/>,
/// the very same service the overdue page uses.
/// </summary>
public sealed class GetCenterReportsQueryHandler
    : ResponseHandler,
      IRequestHandler<GetCenterReportsQuery, Response<CenterReportsDto>>
{
    private readonly AppDbContext _context;
    private readonly IMonthlyDueService _dueService;
    private readonly ITenantContext _tenantContext;
    private readonly ICenterModuleService _centerModules;

    public GetCenterReportsQueryHandler(
        AppDbContext context,
        IMonthlyDueService dueService,
        ITenantContext tenantContext,
        ICenterModuleService centerModules,
        IStringLocalizer<SharedResources> localizer)
        : base(localizer)
    {
        _context = context;
        _dueService = dueService;
        _tenantContext = tenantContext;
        _centerModules = centerModules;
    }

    public async Task<Response<CenterReportsDto>> Handle(
        GetCenterReportsQuery request,
        CancellationToken cancellationToken)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        var from = request.From ?? new DateOnly(today.Year, today.Month, 1);
        var to = request.To ?? from.AddMonths(1);
        if (to <= from)
            to = from.AddMonths(1);

        var billingPeriod = NormalizeMonth(
            request.BillingPeriod ?? new DateOnly(today.Year, today.Month, 1));

        var fromDt = from.ToDateTime(TimeOnly.MinValue);
        var toDt = to.ToDateTime(TimeOnly.MinValue);

        // =========================================================
        // Totals
        // =========================================================

        var activeStudents = await _context.Students
            .CountAsync(s => s.IsActive, cancellationToken);

        var groups = await _context.Groups
            .Select(g => new { g.Id, g.Name })
            .ToListAsync(cancellationToken);

        // Assistent is ITenantEntity, so the global tenant filter already applies.
        var assistantsCount = await _context.Assistents
            .CountAsync(cancellationToken);

        // =========================================================
        // Teachers of the center + their groups
        // =========================================================

        var teachers = await LoadTeachersAsync(cancellationToken);

        var teacherGroupRows = await _context.TeacherGroups
            .Select(tg => new { tg.TeacherId, tg.GroupId })
            .ToListAsync(cancellationToken);

        var groupsByTeacher = teacherGroupRows
            .GroupBy(x => x.TeacherId)
            .ToDictionary(g => g.Key, g => g.Select(x => x.GroupId).ToList());

        var teacherNameById = teachers.ToDictionary(t => t.Id, t => t.FullName);

        var teacherNameByGroup = teacherGroupRows
            .GroupBy(x => x.GroupId)
            .ToDictionary(
                g => g.Key,
                g => g.Select(x => teacherNameById.GetValueOrDefault(x.TeacherId, string.Empty))
                      .FirstOrDefault(n => !string.IsNullOrWhiteSpace(n))
                      ?? string.Empty);

        // =========================================================
        // Active students per group
        // =========================================================

        var studentsByGroup = (await _context.StudentGroups
                .Where(sg => sg.IsActive && sg.LeftAt == null && sg.Student.IsActive)
                .GroupBy(sg => sg.GroupId)
                .Select(g => new { GroupId = g.Key, Count = g.Count() })
                .ToListAsync(cancellationToken))
            .ToDictionary(x => x.GroupId, x => x.Count);

        // =========================================================
        // Attendance rate per group (Present / total) for the range
        // =========================================================

        var attendanceByGroup = (await _context.Attendances
                .Where(a => a.AttendanceDate >= from && a.AttendanceDate < to)
                .GroupBy(a => a.Session.GroupId)
                .Select(g => new
                {
                    GroupId = g.Key,
                    Total = g.Count(),
                    Present = g.Count(x => x.Status == AttendanceStatus.Present)
                })
                .ToListAsync(cancellationToken))
            .ToDictionary(x => x.GroupId, x => x);

        // =========================================================
        // Finance lines for the range
        // Decimal aggregation is done client-side (SQLite does not aggregate
        // decimals); the center's monthly volume is small.
        // =========================================================

        var paymentRows = await _context.StudentAmounts
            .Where(sa => sa.Payment.PaymentDate >= fromDt && sa.Payment.PaymentDate < toDt)
            .Select(sa => new { sa.Payment.GroupId, sa.Amount })
            .ToListAsync(cancellationToken);

        var studentPaymentsCollected = paymentRows.Sum(x => x.Amount);

        var collectedByGroup = paymentRows
            .GroupBy(x => x.GroupId)
            .ToDictionary(g => g.Key, g => g.Sum(x => x.Amount));

        var incomeRows = await _context.Incomes
            .Where(i => i.IncomeDate >= from && i.IncomeDate < to)
            .Select(i => new { i.Amount })
            .ToListAsync(cancellationToken);

        var otherIncomes = incomeRows.Sum(x => x.Amount);

        var expenseRows = await _context.Expenses
            .Where(e => e.ExpenseDate >= from && e.ExpenseDate < to)
            .Select(e => new { e.Amount })
            .ToListAsync(cancellationToken);

        var expenses = expenseRows.Sum(x => x.Amount);

        // Assistant salaries: sum the salary records whose month falls inside
        // the range (there is no paid-date requirement, matching the dashboard).
        var salaryRows = await _context.AssistantPayments
            .Where(ap =>
                (ap.Year > from.Year || (ap.Year == from.Year && ap.Month >= from.Month)) &&
                (ap.Year < to.Year || (ap.Year == to.Year && ap.Month < to.Month)))
            .Select(ap => new { ap.NetSalary })
            .ToListAsync(cancellationToken);

        var assistantSalaries = salaryRows.Sum(x => x.NetSalary);

        var net = studentPaymentsCollected + otherIncomes - expenses - assistantSalaries;

        // =========================================================
        // Per teacher
        // =========================================================

        var teacherDtos = new List<CenterReportTeacherDto>();

        foreach (var teacher in teachers)
        {
            var teacherGroups = groupsByTeacher.GetValueOrDefault(teacher.Id)
                                ?? new List<Guid>();

            var studentsCount = teacherGroups.Sum(gid => studentsByGroup.GetValueOrDefault(gid));
            var collected = teacherGroups.Sum(gid => collectedByGroup.GetValueOrDefault(gid));

            var total = 0;
            var present = 0;
            foreach (var gid in teacherGroups)
            {
                if (attendanceByGroup.TryGetValue(gid, out var attendance))
                {
                    total += attendance.Total;
                    present += attendance.Present;
                }
            }

            teacherDtos.Add(new CenterReportTeacherDto
            {
                TeacherId = teacher.Id,
                TeacherName = teacher.FullName,
                GroupsCount = teacherGroups.Distinct().Count(),
                StudentsCount = studentsCount,
                CollectedInRange = collected,
                AttendanceRate = Rate(present, total)
            });
        }

        teacherDtos = teacherDtos
            .OrderByDescending(x => x.CollectedInRange)
            .ThenBy(x => x.TeacherName)
            .ToList();

        // =========================================================
        // Per group (expected / collected / outstanding for the billing month,
        // via the shared monthly-due service used by the overdue page)
        // =========================================================

        var dueRows = await _dueService.CalculateDueAsync(
            UserScope.Full,
            null,
            billingPeriod,
            null,
            cancellationToken);

        var dueByGroup = dueRows
            .GroupBy(x => x.GroupId)
            .ToDictionary(
                g => g.Key,
                g => new
                {
                    Expected = g.Sum(x => x.TotalAmount),
                    Collected = g.Sum(x => x.PaidAmount),
                    Outstanding = g.Sum(x => x.RemainingAmount)
                });

        var groupDtos = new List<CenterReportGroupDto>();

        foreach (var group in groups)
        {
            attendanceByGroup.TryGetValue(group.Id, out var attendance);
            dueByGroup.TryGetValue(group.Id, out var due);

            groupDtos.Add(new CenterReportGroupDto
            {
                GroupId = group.Id,
                GroupName = group.Name,
                TeacherName = teacherNameByGroup.GetValueOrDefault(group.Id, string.Empty),
                StudentsCount = studentsByGroup.GetValueOrDefault(group.Id),
                AttendanceRate = attendance is null
                    ? 0
                    : Rate(attendance.Present, attendance.Total),
                Expected = due?.Expected ?? 0,
                Collected = due?.Collected ?? 0,
                Outstanding = due?.Outstanding ?? 0
            });
        }

        groupDtos = groupDtos
            .OrderBy(x => x.GroupName)
            .ToList();

        // =========================================================
        // Last 6 months trend (income vs operational expenses)
        // =========================================================

        var lastMonth = new DateOnly(to.Year, to.Month, 1).AddMonths(-1);
        var trendStart = lastMonth.AddMonths(-5);
        var trendEnd = lastMonth.AddMonths(1);
        var trendStartDt = trendStart.ToDateTime(TimeOnly.MinValue);
        var trendEndDt = trendEnd.ToDateTime(TimeOnly.MinValue);

        var paymentTrend = await _context.StudentAmounts
            .Where(sa => sa.Payment.PaymentDate >= trendStartDt && sa.Payment.PaymentDate < trendEndDt)
            .Select(sa => new
            {
                Year = sa.Payment.PaymentDate.Year,
                Month = sa.Payment.PaymentDate.Month,
                sa.Amount
            })
            .ToListAsync(cancellationToken);

        var incomeTrend = await _context.Incomes
            .Where(i => i.IncomeDate >= trendStart && i.IncomeDate < trendEnd)
            .Select(i => new { Year = i.IncomeDate.Year, Month = i.IncomeDate.Month, i.Amount })
            .ToListAsync(cancellationToken);

        var expenseTrend = await _context.Expenses
            .Where(e => e.ExpenseDate >= trendStart && e.ExpenseDate < trendEnd)
            .Select(e => new { Year = e.ExpenseDate.Year, Month = e.ExpenseDate.Month, e.Amount })
            .ToListAsync(cancellationToken);

        var trend = new List<CenterReportTrendPointDto>();
        for (var i = 0; i < 6; i++)
        {
            var month = trendStart.AddMonths(i);

            var income =
                paymentTrend.Where(x => x.Year == month.Year && x.Month == month.Month).Sum(x => x.Amount) +
                incomeTrend.Where(x => x.Year == month.Year && x.Month == month.Month).Sum(x => x.Amount);

            var monthExpenses =
                expenseTrend.Where(x => x.Year == month.Year && x.Month == month.Month).Sum(x => x.Amount);

            trend.Add(new CenterReportTrendPointDto
            {
                Year = month.Year,
                Month = month.Month,
                Income = income,
                Expenses = monthExpenses
            });
        }

        // =========================================================
        // Assemble
        // =========================================================

        var centerTypeValue = _tenantContext.CenterId.HasValue
            ? await _context.Centers
                .Where(c => c.Id == _tenantContext.CenterId.Value)
                .Select(c => (CenterType?)c.Type)
                .FirstOrDefaultAsync(cancellationToken)
            : (CenterType?)null;

        string? soloTeacherSubject = null;
        if (centerTypeValue == CenterType.SoloTeacher && _tenantContext.CenterId.HasValue)
        {
            var centerId = _tenantContext.CenterId.Value;
            soloTeacherSubject = await _context.TeacherProfiles
                .Where(tp => tp.User.CenterId == centerId && tp.User.IsCenterAdmin)
                .Select(tp => tp.Subject)
                .FirstOrDefaultAsync(cancellationToken);
        }

        var dto = new CenterReportsDto
        {
            Role = _tenantContext.Role ?? string.Empty,
            CenterType = centerTypeValue?.ToString() ?? string.Empty,
            SoloTeacherSubject = soloTeacherSubject,
            From = from,
            To = to,
            BillingPeriod = billingPeriod,
            Totals = new CenterReportTotalsDto
            {
                ActiveStudents = activeStudents,
                Teachers = teachers.Count,
                Assistants = assistantsCount,
                Groups = groups.Count
            },
            Finance = new CenterReportFinanceDto
            {
                StudentPaymentsCollected = studentPaymentsCollected,
                OtherIncomes = otherIncomes,
                Expenses = expenses,
                AssistantSalaries = assistantSalaries,
                Net = net
            },
            Teachers = teacherDtos,
            Groups = groupDtos,
            Trend = trend
        };

        // Omit/zero the parts that belong to a module the center has not enabled,
        // so finance/attendance data is never leaked (UI alone is not enough).
        var (paymentsOn, accountingOn, attendanceOn) = await ResolveModulesAsync(cancellationToken);

        if (!attendanceOn)
        {
            foreach (var t in dto.Teachers)
                t.AttendanceRate = 0;
            foreach (var g in dto.Groups)
                g.AttendanceRate = 0;
        }

        if (!paymentsOn)
        {
            dto.Finance.StudentPaymentsCollected = 0;
            foreach (var t in dto.Teachers)
                t.CollectedInRange = 0;
            foreach (var g in dto.Groups)
            {
                g.Expected = 0;
                g.Collected = 0;
                g.Outstanding = 0;
            }
            foreach (var p in dto.Trend)
                p.Income = 0;
        }

        if (!accountingOn)
        {
            dto.Finance.OtherIncomes = 0;
            dto.Finance.Expenses = 0;
            dto.Finance.AssistantSalaries = 0;
            foreach (var p in dto.Trend)
                p.Expenses = 0;
        }

        dto.Finance.Net =
            dto.Finance.StudentPaymentsCollected
            + dto.Finance.OtherIncomes
            - dto.Finance.Expenses
            - dto.Finance.AssistantSalaries;

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

    private async Task<List<(Guid Id, string FullName)>> LoadTeachersAsync(
        CancellationToken cancellationToken)
    {
        var roleId = await _context.Roles
            .Where(r => r.Name == AppRoles.Teacher)
            .Select(r => r.Id)
            .FirstOrDefaultAsync(cancellationToken);

        if (roleId == Guid.Empty)
            return new List<(Guid, string)>();

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

        var rows = await query
            .Select(u => new { u.Id, u.FullName })
            .ToListAsync(cancellationToken);

        return rows.Select(x => (x.Id, x.FullName)).ToList();
    }

    private static DateOnly NormalizeMonth(DateOnly value) =>
        new(value.Year, value.Month, 1);

    private static double Rate(int present, int total) =>
        total == 0 ? 0 : Math.Round(present * 100.0 / total, 2);
}

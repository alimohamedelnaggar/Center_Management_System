using CenterManagement.Core.Features.Platform.Queries.Models;
using CenterManagement.Data.AppMetaData;
using CenterManagement.Data.Entities.Subscriptions;
using CenterManagement.Data.Enums;
using CenterManagement.Data.Results;
using CenterManagement.Infrustructure.Data;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Localization;

namespace CenterManagement.Core.Features.Platform.Queries.Handlers;

public class GetPlatformStatisticsQueryHandler
    : ResponseHandler, IRequestHandler<GetPlatformStatisticsQuery, Response<PlatformStatisticsDto>>
{
    private readonly AppDbContext _context;
    private readonly TimeProvider _timeProvider;

    public GetPlatformStatisticsQueryHandler(
        IStringLocalizer<SharedResources> localizer,
        AppDbContext context,
        TimeProvider timeProvider) : base(localizer)
    {
        _context = context;
        _timeProvider = timeProvider;
    }

    public async Task<Response<PlatformStatisticsDto>> Handle(
        GetPlatformStatisticsQuery request,
        CancellationToken cancellationToken)
    {
        var centers = _context.Centers.AsNoTracking();

        var dto = new PlatformStatisticsDto
        {
            TotalCenters = await centers.CountAsync(cancellationToken),
            ActiveCenters = await centers.CountAsync(c => c.Status == CenterStatus.Active, cancellationToken),
            SuspendedCenters = await centers.CountAsync(c => c.Status == CenterStatus.Suspended, cancellationToken),
            ExpiredCenters = await centers.CountAsync(c => c.Status == CenterStatus.Expired, cancellationToken),
            SoloTeacherCenters = await centers.CountAsync(c => c.Type == CenterType.SoloTeacher, cancellationToken),
            MultiTeacherCenters = await centers.CountAsync(c => c.Type == CenterType.MultiTeacher, cancellationToken),
        };

        var now = _timeProvider.GetUtcNow().UtcDateTime;
        var startOfMonth = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        var startOfNextMonth = startOfMonth.AddMonths(1);

        dto.CentersCreatedThisMonth = await centers.CountAsync(
            c => c.CreatedAt >= startOfMonth && c.CreatedAt < startOfNextMonth,
            cancellationToken);

        dto.ActiveSubscriptions = await centers.CountAsync(
            c => c.Status == CenterStatus.Active
                 && (c.SubscriptionEnd == null || c.SubscriptionEnd >= now),
            cancellationToken);

        // Derived per-center state: count centers currently inside their grace window.
        var allCenters = await centers
            .Select(c => new { c.Status, c.SubscriptionEnd, c.GraceDays })
            .ToListAsync(cancellationToken);

        dto.CentersInGrace = allCenters.Count(c =>
        {
            if (c.Status == CenterStatus.Suspended || c.SubscriptionEnd is null)
                return false;

            var today = now.Date;
            var endDate = c.SubscriptionEnd.Value.Date;

            return today > endDate && today <= endDate.AddDays(Math.Max(0, c.GraceDays));
        });

        dto.TotalUsers = await _context.Users.AsNoTracking().CountAsync(cancellationToken);
        dto.TotalGroups = await _context.Groups.AsNoTracking().CountAsync(cancellationToken);

        var roleCounts = await (
            from userRole in _context.UserRoles.AsNoTracking()
            join role in _context.Roles.AsNoTracking() on userRole.RoleId equals role.Id
            group userRole by role.Name into g
            select new { RoleName = g.Key, Count = g.Count() })
            .ToListAsync(cancellationToken);

        int CountFor(string role) =>
            roleCounts.FirstOrDefault(x => x.RoleName == role)?.Count ?? 0;

        dto.TotalOwners = CountFor(AppRoles.CenterOwner);
        dto.TotalTeachers = CountFor(AppRoles.Teacher);
        dto.TotalAssistants = CountFor(AppRoles.Assistant);
        dto.TotalStudents = CountFor(AppRoles.Student);

        // Count per subscription plan type (the latest subscription row per center).
        var subscriptions = await _context.CenterSubscriptions.AsNoTracking()
            .IgnoreQueryFilters()
            .Where(s => !s.IsDeleted && s.CenterId != null)
            .Select(s => new { s.CenterId, s.Type, s.CreatedAt, s.Id })
            .ToListAsync(cancellationToken);

        dto.SubscriptionsByType = subscriptions
            .GroupBy(s => s.CenterId!.Value)
            .Select(g => g.OrderByDescending(s => s.CreatedAt).ThenByDescending(s => s.Id).First())
            .GroupBy(s => s.Type)
            .OrderBy(g => g.Key)
            .Select(g => new SubscriptionTypeCountDto
            {
                Type = g.Key.ToString(),
                Label = PlanLabel(g.Key),
                Count = g.Count()
            })
            .ToList();

        // Subscription-payment revenue recorded per month (current year).
        var yearStart = new DateTime(now.Year, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        var yearEnd = yearStart.AddYears(1);

        var payments = await _context.CenterSubscriptionPayments.AsNoTracking()
            .IgnoreQueryFilters()
            .Where(p => !p.IsDeleted && p.PaidAt >= yearStart && p.PaidAt < yearEnd)
            .Select(p => new { p.Amount, p.PaidAt })
            .ToListAsync(cancellationToken);

        var revenueByMonth = payments
            .GroupBy(p => p.PaidAt.Month)
            .ToDictionary(g => g.Key, g => g.Sum(p => p.Amount));

        dto.RevenueByMonth = Enumerable.Range(1, 12)
            .Select(month => new MonthlyRevenueDto
            {
                Month = month,
                Revenue = revenueByMonth.GetValueOrDefault(month)
            })
            .ToList();

        dto.MonthlyRevenue = revenueByMonth.GetValueOrDefault(now.Month);

        return Success(dto);
    }

    private static string PlanLabel(SubscriptionPlanType type) => type switch
    {
        SubscriptionPlanType.Monthly => "شهري",
        SubscriptionPlanType.Quarterly => "ربع سنوي",
        SubscriptionPlanType.SemiAnnual => "نصف سنوي",
        SubscriptionPlanType.Annual => "سنوي",
        SubscriptionPlanType.Lifetime => "مدى الحياة",
        _ => type.ToString()
    };
}

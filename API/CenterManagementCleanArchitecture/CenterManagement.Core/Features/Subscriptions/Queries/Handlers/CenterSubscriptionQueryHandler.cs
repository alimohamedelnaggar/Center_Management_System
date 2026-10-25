using CenterManagement.Core.Bases;
using CenterManagement.Core.Features.Subscriptions.Queries.Models;
using CenterManagement.Data.AppMetaData;
using CenterManagement.Data.Entities;
using CenterManagement.Data.Entities.Subscriptions;
using CenterManagement.Data.Results;
using CenterManagement.Infrustructure.Data;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Localization;

namespace CenterManagement.Core.Features.Subscriptions.Queries.Handlers;

/// <summary>
/// Read side of the SuperAdmin subscription screen. All queries run unrestricted
/// (platform scope) and derive the live state via <see cref="CenterSubscriptionEvaluator"/>.
/// </summary>
public class CenterSubscriptionQueryHandler :
    ResponseHandler,
    IRequestHandler<GetCenterSubscriptionsQuery, Response<List<CenterSubscriptionListItemDto>>>,
    IRequestHandler<GetCenterSubscriptionQuery, Response<CenterSubscriptionDetailDto>>,
    IRequestHandler<GetCenterSubscriptionHistoryQuery, Response<CenterSubscriptionHistoryDto>>,
    IRequestHandler<PreviewCenterModulesQuery, Response<CenterModuleResolutionDto>>
{
    /// <summary>Centers whose active subscription ends within this many days are highlighted.</summary>
    public const int ExpiringSoonWindowDays = 14;

    private const string DefaultCurrency = "EGP";

    private readonly AppDbContext _context;
    private readonly TimeProvider _timeProvider;

    public CenterSubscriptionQueryHandler(
        IStringLocalizer<SharedResources> localizer,
        AppDbContext context,
        TimeProvider timeProvider) : base(localizer)
    {
        _context = context;
        _timeProvider = timeProvider;
    }

    public async Task<Response<List<CenterSubscriptionListItemDto>>> Handle(
        GetCenterSubscriptionsQuery request,
        CancellationToken cancellationToken)
    {
        var now = _timeProvider.GetUtcNow().UtcDateTime;

        var query = _context.Centers.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var search = request.Search.Trim();
            query = query.Where(center =>
                center.Name.Contains(search) ||
                (center.Phone != null && center.Phone.Contains(search)));
        }

        var centers = await query
            .OrderBy(center => center.Name)
            .ToListAsync(cancellationToken);

        var centerIds = centers.Select(center => center.Id).ToList();

        var subscriptions = await _context.CenterSubscriptions.AsNoTracking()
            .IgnoreQueryFilters()
            .Where(subscription => !subscription.IsDeleted &&
                                   subscription.CenterId != null &&
                                   centerIds.Contains(subscription.CenterId.Value))
            .ToListAsync(cancellationToken);

        var latestSubscriptions = subscriptions
            .GroupBy(subscription => subscription.CenterId!.Value)
            .ToDictionary(
                group => group.Key,
                group => group.OrderByDescending(s => s.CreatedAt).ThenByDescending(s => s.Id).First());

        var moduleRows = await _context.CenterModules.AsNoTracking()
            .IgnoreQueryFilters()
            .Where(module => !module.IsDeleted &&
                             module.CenterId != null &&
                             centerIds.Contains(module.CenterId.Value))
            .Select(module => new { module.CenterId, module.ModuleKey, module.IsEnabled })
            .ToListAsync(cancellationToken);

        var enabledCounts = moduleRows
            .Where(module => module.IsEnabled)
            .GroupBy(module => module.CenterId!.Value)
            .ToDictionary(
                group => group.Key,
                group => group.Select(module => module.ModuleKey).Distinct(StringComparer.OrdinalIgnoreCase).Count());

        var items = centers.Select(center =>
        {
            var info = CenterSubscriptionEvaluator.Evaluate(center, now);
            var (daysUntilExpiry, expiringSoon) = ExpiryInfo(info, now);

            latestSubscriptions.TryGetValue(center.Id, out var subscription);

            return new CenterSubscriptionListItemDto
            {
                Id = center.Id,
                Name = center.Name,
                IsActive = center.IsActive,
                Status = center.Status.ToString(),
                State = info.State.ToString(),
                DaysLeftInGrace = info.DaysLeftInGrace,
                DaysUntilExpiry = daysUntilExpiry,
                ExpiringSoon = expiringSoon,
                Type = subscription?.Type.ToString(),
                Plan = center.Plan,
                SubscriptionStart = center.SubscriptionStart,
                SubscriptionEnd = center.SubscriptionEnd,
                GraceDays = center.GraceDays,
                Price = subscription?.Price ?? 0m,
                PaidAmount = subscription?.PaidAmount ?? 0m,
                Currency = subscription?.Currency ?? DefaultCurrency,
                EnabledModuleCount = enabledCounts.GetValueOrDefault(center.Id),
                TotalModuleCount = ModuleKeys.All.Length
            };
        }).ToList();

        return Success(items);
    }

    public async Task<Response<CenterSubscriptionDetailDto>> Handle(
        GetCenterSubscriptionQuery request,
        CancellationToken cancellationToken)
    {
        var dto = await BuildDetailAsync(_context, _timeProvider, request.CenterId, cancellationToken);

        if (dto is null)
            return NotFound<CenterSubscriptionDetailDto>("المركز غير موجود");

        return Success(dto);
    }

    public async Task<Response<CenterSubscriptionHistoryDto>> Handle(
        GetCenterSubscriptionHistoryQuery request,
        CancellationToken cancellationToken)
    {
        var dto = await BuildHistoryAsync(_context, request.CenterId, cancellationToken);

        if (dto is null)
            return NotFound<CenterSubscriptionHistoryDto>("المركز غير موجود");

        return Success(dto);
    }

    /// <summary>
    /// Builds the history payload (all periods + payments + remaining balance).
    /// Shared with the add-payment command so a write returns the same shape as a GET.
    /// </summary>
    public static async Task<CenterSubscriptionHistoryDto?> BuildHistoryAsync(
        AppDbContext context,
        Guid centerId,
        CancellationToken cancellationToken)
    {
        var center = await context.Centers.AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == centerId, cancellationToken);

        if (center is null)
            return null;

        var subscriptions = await context.CenterSubscriptions.AsNoTracking()
            .IgnoreQueryFilters()
            .Where(s => !s.IsDeleted && s.CenterId == center.Id)
            .OrderByDescending(s => s.CreatedAt).ThenByDescending(s => s.Id)
            .ToListAsync(cancellationToken);

        var subscriptionIds = subscriptions.Select(s => s.Id).ToList();

        var payments = await context.CenterSubscriptionPayments.AsNoTracking()
            .IgnoreQueryFilters()
            .Where(p => !p.IsDeleted && subscriptionIds.Contains(p.CenterSubscriptionId))
            .OrderBy(p => p.PaidAt)
            .ToListAsync(cancellationToken);

        var paymentsBySubscription = payments
            .GroupBy(p => p.CenterSubscriptionId)
            .ToDictionary(group => group.Key, group => group.ToList());

        var current = subscriptions.FirstOrDefault();

        return new CenterSubscriptionHistoryDto
        {
            CenterId = center.Id,
            CenterName = center.Name,
            Price = current?.Price ?? 0m,
            PaidAmount = current?.PaidAmount ?? 0m,
            RemainingAmount = (current?.Price ?? 0m) - (current?.PaidAmount ?? 0m),
            Currency = current?.Currency ?? DefaultCurrency,
            Subscriptions = subscriptions.Select(subscription => new CenterSubscriptionHistoryItemDto
            {
                Id = subscription.Id,
                Type = subscription.Type.ToString(),
                StartDate = subscription.StartDate,
                EndDate = subscription.EndDate,
                Price = subscription.Price,
                PaidAmount = subscription.PaidAmount,
                Currency = subscription.Currency,
                Notes = subscription.Notes,
                CreatedAt = subscription.CreatedAt,
                Payments = paymentsBySubscription.TryGetValue(subscription.Id, out var list)
                    ? list.Select(payment => new CenterSubscriptionPaymentDto
                    {
                        Id = payment.Id,
                        Amount = payment.Amount,
                        PaidAt = payment.PaidAt,
                        Method = payment.Method,
                        Note = payment.Note
                    }).ToList()
                    : []
            }).ToList()
        };
    }

    /// <summary>
    /// Builds the detail payload. Shared with the command handler so a
    /// write returns exactly the same shape as a subsequent GET.
    /// </summary>
    public static async Task<CenterSubscriptionDetailDto?> BuildDetailAsync(
        AppDbContext context,
        TimeProvider timeProvider,
        Guid centerId,
        CancellationToken cancellationToken)
    {
        var now = timeProvider.GetUtcNow().UtcDateTime;

        var center = await context.Centers.AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == centerId, cancellationToken);

        if (center is null)
            return null;

        var subscription = await context.CenterSubscriptions.AsNoTracking()
            .IgnoreQueryFilters()
            .Where(s => !s.IsDeleted && s.CenterId == center.Id)
            .OrderByDescending(s => s.CreatedAt).ThenByDescending(s => s.Id)
            .FirstOrDefaultAsync(cancellationToken);

        var enabledKeys = await context.CenterModules.AsNoTracking()
            .IgnoreQueryFilters()
            .Where(module => !module.IsDeleted && module.CenterId == center.Id && module.IsEnabled)
            .Select(module => module.ModuleKey)
            .ToListAsync(cancellationToken);

        var info = CenterSubscriptionEvaluator.Evaluate(center, now);
        var (daysUntilExpiry, expiringSoon) = ExpiryInfo(info, now);

        return new CenterSubscriptionDetailDto
        {
            CenterId = center.Id,
            CenterName = center.Name,
            IsActive = center.IsActive,
            Status = center.Status.ToString(),
            State = info.State.ToString(),
            DaysLeftInGrace = info.DaysLeftInGrace,
            DaysUntilExpiry = daysUntilExpiry,
            ExpiringSoon = expiringSoon,
            Type = subscription?.Type.ToString(),
            Plan = center.Plan,
            SubscriptionStart = center.SubscriptionStart,
            SubscriptionEnd = center.SubscriptionEnd,
            GraceDays = center.GraceDays,
            Price = subscription?.Price ?? 0m,
            PaidAmount = subscription?.PaidAmount ?? 0m,
            Currency = subscription?.Currency ?? DefaultCurrency,
            Notes = subscription?.Notes ?? center.Notes,
            Modules = BuildModuleStates(enabledKeys),
            Presets = BuildPresets()
        };
    }

    public async Task<Response<CenterModuleResolutionDto>> Handle(
        PreviewCenterModulesQuery request,
        CancellationToken cancellationToken)
    {
        var center = await _context.Centers.AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == request.CenterId, cancellationToken);

        if (center is null)
            return NotFound<CenterModuleResolutionDto>("المركز غير موجود");

        var currentlyEnabled = await _context.CenterModules.AsNoTracking()
            .IgnoreQueryFilters()
            .Where(module => !module.IsDeleted && module.CenterId == center.Id && module.IsEnabled)
            .Select(module => module.ModuleKey)
            .ToListAsync(cancellationToken);

        var resolution = CenterModuleResolver.Resolve(
            request.EnabledModules, currentlyEnabled, request.DisableDependents);

        return Success(MapResolution(center.Id, resolution));
    }

    internal static List<CenterModuleStateDto> BuildModuleStates(IEnumerable<string> enabledKeys)
    {
        var enabled = new HashSet<string>(enabledKeys, StringComparer.OrdinalIgnoreCase);

        return ModuleKeys.All.Select(key => new CenterModuleStateDto
        {
            Key = key,
            Name = ModuleCatalog.DisplayName(key),
            Enabled = enabled.Contains(key),
            Requires = ModuleCatalog.Requires(key).ToList(),
            RequiredBy = ModuleCatalog.Dependents(key).ToList()
        }).ToList();
    }

    internal static List<ModulePresetDto> BuildPresets() =>
        ModulePresets.All.Select(preset => new ModulePresetDto
        {
            Key = preset.Key,
            Name = preset.Name,
            PlanLabel = preset.PlanLabel,
            Modules = preset.Modules.ToList()
        }).ToList();

    internal static CenterModuleResolutionDto MapResolution(Guid centerId, ModuleResolution resolution) =>
        new()
        {
            CenterId = centerId,
            Enabled = resolution.Enabled.OrderBy(key => key, StringComparer.OrdinalIgnoreCase).ToList(),
            AutoEnabled = resolution.AutoEnabled.OrderBy(key => key, StringComparer.OrdinalIgnoreCase).ToList(),
            AutoEnabledNames = resolution.AutoEnabled
                .Select(ModuleCatalog.DisplayName)
                .OrderBy(name => name).ToList(),
            ForceDisabled = resolution.ForceDisabled.OrderBy(key => key, StringComparer.OrdinalIgnoreCase).ToList(),
            ForceDisabledNames = resolution.ForceDisabled
                .Select(ModuleCatalog.DisplayName)
                .OrderBy(name => name).ToList(),
            Conflicts = resolution.Conflicts.Select(conflict => new ModuleConflictDto
            {
                Module = conflict.Module,
                ModuleName = ModuleCatalog.DisplayName(conflict.Module),
                Dependents = conflict.Dependents.ToList(),
                DependentNames = conflict.Dependents.Select(ModuleCatalog.DisplayName).ToList()
            }).ToList()
        };

    private static (int? DaysUntilExpiry, bool ExpiringSoon) ExpiryInfo(
        CenterSubscriptionInfo info,
        DateTime now)
    {
        if (info.EndDate is null)
            return (null, false);

        var days = (info.EndDate.Value.Date - now.Date).Days;
        var expiringSoon = info.State == CenterSubscriptionState.Active &&
                           days >= 0 && days <= ExpiringSoonWindowDays;

        return (days, expiringSoon);
    }
}

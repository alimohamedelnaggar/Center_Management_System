using CenterManagement.Core.Bases;
using CenterManagement.Core.Features.Subscriptions.Commands.Models;
using CenterManagement.Core.Features.Subscriptions.Queries.Handlers;
using CenterManagement.Core.Features.Subscriptions.Queries.Models;
using CenterManagement.Data.AppMetaData;
using CenterManagement.Data.Entities;
using CenterManagement.Data.Entities.Abstractions;
using CenterManagement.Data.Entities.Subscriptions;
using CenterManagement.Data.Enums;
using CenterManagement.Data.Results;
using CenterManagement.Infrustructure.Data;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Localization;

namespace CenterManagement.Core.Features.Subscriptions.Commands.Handlers;

/// <summary>
/// Write side of the SuperAdmin subscription screen: edit the subscription window,
/// renew it, and change the enabled modules. Every action is audited and a module
/// change invalidates the in-process module cache immediately.
/// </summary>
public class CenterSubscriptionCommandHandler :
    ResponseHandler,
    IRequestHandler<UpdateCenterSubscriptionCommand, Response<CenterSubscriptionDetailDto>>,
    IRequestHandler<RenewCenterSubscriptionCommand, Response<CenterSubscriptionDetailDto>>,
    IRequestHandler<UpdateCenterModulesCommand, Response<CenterModuleResolutionDto>>,
    IRequestHandler<AddCenterSubscriptionPaymentCommand, Response<CenterSubscriptionHistoryDto>>
{
    private const string DefaultCurrency = "EGP";

    private readonly AppDbContext _context;
    private readonly TimeProvider _timeProvider;
    private readonly IAuditLogService _auditLog;
    private readonly ICenterModuleService _moduleService;

    public CenterSubscriptionCommandHandler(
        IStringLocalizer<SharedResources> localizer,
        AppDbContext context,
        TimeProvider timeProvider,
        IAuditLogService auditLog,
        ICenterModuleService moduleService) : base(localizer)
    {
        _context = context;
        _timeProvider = timeProvider;
        _auditLog = auditLog;
        _moduleService = moduleService;
    }

    public async Task<Response<CenterSubscriptionDetailDto>> Handle(
        UpdateCenterSubscriptionCommand request,
        CancellationToken cancellationToken)
    {
        var center = await _context.Centers
            .FirstOrDefaultAsync(c => c.Id == request.CenterId, cancellationToken);

        if (center is null)
            return NotFound<CenterSubscriptionDetailDto>("المركز غير موجود");

        var now = _timeProvider.GetUtcNow().UtcDateTime;

        var start = request.StartDate;
        var end = request.Type == SubscriptionPlanType.Lifetime
            ? null
            : request.EndDate ?? ComputeEnd(start, request.Type);

        if (end is not null && end.Value.Date <= start.Date)
            return BadRequest<CenterSubscriptionDetailDto>("تاريخ الانتهاء يجب أن يكون بعد تاريخ البداية");

        if (request.GraceDays < 0)
            return BadRequest<CenterSubscriptionDetailDto>("أيام السماح لا يمكن أن تكون سالبة");

        center.SubscriptionStart = start;
        center.SubscriptionEnd = end;
        center.GraceDays = request.GraceDays;
        center.Plan = string.IsNullOrWhiteSpace(request.Plan) ? PlanLabel(request.Type) : request.Plan!.Trim();
        center.UpdatedAt = now;

        ApplyEffectiveStatus(center, now);

        var subscription = await GetCurrentSubscriptionAsync(center.Id, cancellationToken);

        if (subscription is null)
        {
            subscription = new CenterSubscription { CenterId = center.Id };
            _context.CenterSubscriptions.Add(subscription);
        }

        subscription.Type = request.Type;
        subscription.StartDate = start;
        subscription.EndDate = end;
        subscription.Price = request.Price;
        subscription.PaidAmount = request.PaidAmount;
        subscription.Currency = string.IsNullOrWhiteSpace(request.Currency) ? DefaultCurrency : request.Currency!.Trim();
        subscription.Notes = request.Notes?.Trim();

        await _context.SaveChangesAsync(cancellationToken);

        await _auditLog.WriteAsync(
            action: "UpdateCenterSubscription",
            entityType: "Center",
            entityId: center.Id.ToString(),
            details: $"Subscription set to {request.Type} ({start:yyyy-MM-dd} -> {end:yyyy-MM-dd}), " +
                     $"price={request.Price}, paid={request.PaidAmount}, graceDays={request.GraceDays}",
            cancellationToken: cancellationToken);

        return await BuildDetailAsync(center.Id, "تم تحديث الاشتراك بنجاح", cancellationToken);
    }

    public async Task<Response<CenterSubscriptionDetailDto>> Handle(
        RenewCenterSubscriptionCommand request,
        CancellationToken cancellationToken)
    {
        var center = await _context.Centers
            .FirstOrDefaultAsync(c => c.Id == request.CenterId, cancellationToken);

        if (center is null)
            return NotFound<CenterSubscriptionDetailDto>("المركز المطلوب غير موجود");

        var now = _timeProvider.GetUtcNow().UtcDateTime;

        // Lifetime subscription has no end date and cannot be renewed.
        if (center.SubscriptionEnd is null)
            return BadRequest<CenterSubscriptionDetailDto>("لا يمكن تجديد اشتراك مدى الحياة (لا يحتوي على تاريخ انتهاء).");
        //  - active  -> the new period is stacked on top of the current one
        //               (starts from the current end date)
        //  - in grace-> resumes from the ORIGINAL end date (grace is not free time)
        //  - past grace (expired) -> starts fresh from today
        //  - lifetime (no end) -> starts from today
        var state = CenterSubscriptionEvaluator.Evaluate(center, now).State;

        var start = state == CenterSubscriptionState.Expired
            ? now
            : center.SubscriptionEnd ?? now;

        var end = ComputeEnd(start, request.Type);

        center.SubscriptionStart = start;
        center.SubscriptionEnd = end;
        center.Plan = string.IsNullOrWhiteSpace(request.Plan) ? PlanLabel(request.Type) : request.Plan!.Trim();
        center.UpdatedAt = now;

        // Renewal always reactivates a lapsed center; a manually suspended center
        // stays suspended and must be reactivated explicitly.
        if (center.Status != CenterStatus.Suspended)
            center.Status = CenterStatus.Active;

        // New period => new row (keeps a renewal history).
        _context.CenterSubscriptions.Add(new CenterSubscription
        {
            CenterId = center.Id,
            Type = request.Type,
            StartDate = start,
            EndDate = end,
            Price = request.Price,
            PaidAmount = request.PaidAmount,
            Currency = string.IsNullOrWhiteSpace(request.Currency) ? DefaultCurrency : request.Currency!.Trim(),
            Notes = request.Notes?.Trim()
        });

        await _context.SaveChangesAsync(cancellationToken);

        await _auditLog.WriteAsync(
            action: "RenewCenterSubscription",
            entityType: "Center",
            entityId: center.Id.ToString(),
            details: $"Renewed {request.Type}: {start:yyyy-MM-dd} -> {end:yyyy-MM-dd}, price={request.Price}, paid={request.PaidAmount}",
            cancellationToken: cancellationToken);

        return await BuildDetailAsync(center.Id, "تم تجديد الاشتراك بنجاح", cancellationToken);
    }

    public async Task<Response<CenterSubscriptionHistoryDto>> Handle(
        AddCenterSubscriptionPaymentCommand request,
        CancellationToken cancellationToken)
    {
        if (request.Amount <= 0)
            return BadRequest<CenterSubscriptionHistoryDto>("قيمة الدفعة يجب أن تكون أكبر من صفر");

        var center = await _context.Centers.AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == request.CenterId, cancellationToken);

        if (center is null)
            return NotFound<CenterSubscriptionHistoryDto>("المركز غير موجود");

        var subscription = await GetCurrentSubscriptionAsync(center.Id, cancellationToken);

        if (subscription is null)
            return BadRequest<CenterSubscriptionHistoryDto>("لا يوجد اشتراك مسجّل لهذا المركز. حدّث الاشتراك أولاً.");

        var now = _timeProvider.GetUtcNow().UtcDateTime;

        _context.CenterSubscriptionPayments.Add(new CenterSubscriptionPayment
        {
            CenterId = center.Id,
            CenterSubscriptionId = subscription.Id,
            Amount = request.Amount,
            PaidAt = request.PaidAt ?? now,
            Method = request.Method?.Trim(),
            Note = request.Note?.Trim()
        });

        subscription.PaidAmount += request.Amount;

        await _context.SaveChangesAsync(cancellationToken);

        await _auditLog.WriteAsync(
            action: "AddCenterSubscriptionPayment",
            entityType: "Center",
            entityId: center.Id.ToString(),
            details: $"Payment {request.Amount} {subscription.Currency}; total paid now {subscription.PaidAmount}",
            cancellationToken: cancellationToken);

        var history = await CenterSubscriptionQueryHandler.BuildHistoryAsync(
            _context, center.Id, cancellationToken);

        if (history is null)
            return NotFound<CenterSubscriptionHistoryDto>("المركز غير موجود");

        return Success(history, "تم تسجيل الدفعة بنجاح");
    }

    public async Task<Response<CenterModuleResolutionDto>> Handle(
        UpdateCenterModulesCommand request,
        CancellationToken cancellationToken)
    {
        var center = await _context.Centers.AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == request.CenterId, cancellationToken);

        if (center is null)
            return NotFound<CenterModuleResolutionDto>("المركز غير موجود");

        var rows = await _context.CenterModules
            .Where(module => module.CenterId == center.Id)
            .ToListAsync(cancellationToken);

        var currentlyEnabled = rows
            .Where(module => module.IsEnabled)
            .Select(module => module.ModuleKey)
            .ToList();

        var resolution = CenterModuleResolver.Resolve(
            request.EnabledModules, currentlyEnabled, request.DisableDependents);

        if (resolution.Blocked)
        {
            var parts = resolution.Conflicts.Select(conflict =>
                $"«{ModuleCatalog.DisplayName(conflict.Module)}» مُطلوب بواسطة " +
                string.Join("، ", conflict.Dependents.Select(ModuleCatalog.DisplayName)));

            return BadRequest<CenterModuleResolutionDto>(
                "لا يمكن تعطيل الوحدات التالية لأن وحدات مُفعّلة تعتمد عليها: " +
                string.Join(" | ", parts) +
                ". أعد المحاولة مع خيار تعطيل التبعيات.");
        }

        var byKey = rows.ToDictionary(module => module.ModuleKey, StringComparer.OrdinalIgnoreCase);

        foreach (var key in ModuleKeys.All)
        {
            var enabled = resolution.Enabled.Contains(key);

            if (byKey.TryGetValue(key, out var row))
            {
                row.IsEnabled = enabled;
            }
            else
            {
                _context.CenterModules.Add(new CenterModule
                {
                    CenterId = center.Id,
                    ModuleKey = key,
                    IsEnabled = enabled
                });
            }
        }

        await _context.SaveChangesAsync(cancellationToken);

        // Immediate invalidation so the change is visible on the very next request.
        _moduleService.Invalidate(center.Id);

        await _auditLog.WriteAsync(
            action: "UpdateCenterModules",
            entityType: "Center",
            entityId: center.Id.ToString(),
            details: $"Modules set to [{string.Join(", ", resolution.Enabled.OrderBy(k => k))}]" +
                     (resolution.AutoEnabled.Count > 0 ? $"; auto-enabled [{string.Join(", ", resolution.AutoEnabled)}]" : string.Empty) +
                     (resolution.ForceDisabled.Count > 0 ? $"; disabled dependents [{string.Join(", ", resolution.ForceDisabled)}]" : string.Empty),
            cancellationToken: cancellationToken);

        return Success(
            CenterSubscriptionQueryHandler.MapResolution(center.Id, resolution),
            "تم تحديث وحدات المركز بنجاح");
    }

    private async Task<CenterSubscription?> GetCurrentSubscriptionAsync(Guid centerId, CancellationToken cancellationToken) =>
        await _context.CenterSubscriptions
            .Where(s => s.CenterId == centerId)
            .OrderByDescending(s => s.CreatedAt).ThenByDescending(s => s.Id)
            .FirstOrDefaultAsync(cancellationToken);

    private async Task<Response<CenterSubscriptionDetailDto>> BuildDetailAsync(
        Guid centerId,
        string message,
        CancellationToken cancellationToken)
    {
        var detail = await CenterSubscriptionQueryHandler.BuildDetailAsync(
            _context, _timeProvider, centerId, cancellationToken);

        if (detail is null)
            return NotFound<CenterSubscriptionDetailDto>("المركز غير موجود");

        return Success(detail, message);
    }

    /// <summary>
    /// Derives and persists the center status the same way access enforcement does:
    /// grace keeps the center Active, only past grace it becomes Expired, and a
    /// suspended center stays suspended.
    /// </summary>
    internal static void ApplyEffectiveStatus(Center center, DateTime now)
    {
        if (center.Status == CenterStatus.Suspended)
            return;

        var info = CenterSubscriptionEvaluator.Evaluate(center, now);

        center.Status = info.State switch
        {
            CenterSubscriptionState.Suspended => CenterStatus.Suspended,
            CenterSubscriptionState.Expired => CenterStatus.Expired,
            _ => CenterStatus.Active
        };
    }

    internal static DateTime? ComputeEnd(DateTime start, SubscriptionPlanType type) => type switch
    {
        SubscriptionPlanType.Monthly => start.AddMonths(1),
        SubscriptionPlanType.Quarterly => start.AddMonths(3),
        SubscriptionPlanType.SemiAnnual => start.AddMonths(6),
        SubscriptionPlanType.Annual => start.AddMonths(12),
        SubscriptionPlanType.Lifetime => null,
        _ => start.AddMonths(12)
    };

    internal static string PlanLabel(SubscriptionPlanType type) => type switch
    {
        SubscriptionPlanType.Monthly => "شهري",
        SubscriptionPlanType.Quarterly => "ربع سنوي",
        SubscriptionPlanType.SemiAnnual => "نصف سنوي",
        SubscriptionPlanType.Annual => "سنوي",
        SubscriptionPlanType.Lifetime => "مدى الحياة",
        _ => type.ToString()
    };
}

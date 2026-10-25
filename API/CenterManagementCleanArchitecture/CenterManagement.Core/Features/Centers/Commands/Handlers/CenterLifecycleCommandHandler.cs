using CenterManagement.Core.Bases;
using CenterManagement.Core.Features.Centers.Commands.Models;
using CenterManagement.Data.Entities.Abstractions;
using CenterManagement.Data.Enums;
using CenterManagement.Infrustructure.Data;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Localization;

namespace CenterManagement.Core.Features.Centers.Commands.Handlers;

/// <summary>
/// Center lifecycle operations performed by the SuperAdmin (edit, suspend /
/// activate, delete) plus the solo-teacher self-upgrade to a multi-teacher
/// center. Every action is written to the audit trail.
/// </summary>
public class CenterLifecycleCommandHandler : ResponseHandler,
    IRequestHandler<UpdateCenterCommand, Response<string>>,
    IRequestHandler<SetCenterStatusCommand, Response<string>>,
    IRequestHandler<DeleteCenterCommand, Response<string>>,
    IRequestHandler<UpgradeCenterToMultiTeacherCommand, Response<string>>
{
    private readonly AppDbContext _context;
    private readonly ITenantContext _tenantContext;
    private readonly IAuditLogService _auditLog;

    public CenterLifecycleCommandHandler(
        IStringLocalizer<SharedResources> localizer,
        AppDbContext context,
        ITenantContext tenantContext,
        IAuditLogService auditLog) : base(localizer)
    {
        _context = context;
        _tenantContext = tenantContext;
        _auditLog = auditLog;
    }

    public async Task<Response<string>> Handle(
        UpdateCenterCommand request,
        CancellationToken cancellationToken)
    {
        var center = await _context.Centers
            .FirstOrDefaultAsync(c => c.Id == request.Id, cancellationToken);

        if (center is null)
            return NotFound<string>("المركز غير موجود");

        center.Name = request.Name.Trim();
        center.Phone = request.Phone?.Trim();
        center.Address = request.Address?.Trim();
        center.Description = request.Description?.Trim();
        center.Notes = request.Notes?.Trim();

        if (request.Type.HasValue)
            center.Type = request.Type.Value;

        center.Plan = request.Plan?.Trim();
        center.SubscriptionStart = request.SubscriptionStart;
        center.SubscriptionEnd = request.SubscriptionEnd;
        center.UpdatedAt = DateTime.UtcNow;

        // Keep the status consistent with the new subscription window: extending
        // into the future reactivates an expired center, moving the end into the
        // past expires an active one.
        var now = DateTime.UtcNow;

        if (center.SubscriptionEnd.HasValue && center.SubscriptionEnd.Value < now)
        {
            if (center.Status == CenterStatus.Active)
                center.Status = CenterStatus.Expired;
        }
        else if (center.Status == CenterStatus.Expired)
        {
            center.Status = CenterStatus.Active;
        }

        await _context.SaveChangesAsync(cancellationToken);

        await _auditLog.WriteAsync(
            action: "UpdateCenter",
            entityType: "Center",
            entityId: center.Id.ToString(),
            details: $"Updated center '{center.Name}' (type={center.Type}, plan={center.Plan}, end={center.SubscriptionEnd:o})",
            cancellationToken: cancellationToken);

        return Success<string>(null, "تم تحديث بيانات المركز والاشتراك بنجاح");
    }

    public async Task<Response<string>> Handle(
        SetCenterStatusCommand request,
        CancellationToken cancellationToken)
    {
        if (request.Status is not (CenterStatus.Active or CenterStatus.Suspended))
            return BadRequest<string>("حالة المركز غير صالحة");

        var center = await _context.Centers
            .FirstOrDefaultAsync(c => c.Id == request.Id, cancellationToken);

        if (center is null)
            return NotFound<string>("المركز غير موجود");

        var now = DateTime.UtcNow;

        // Reactivating a center whose subscription has lapsed keeps it expired.
        if (request.Status == CenterStatus.Active &&
            center.SubscriptionEnd.HasValue &&
            center.SubscriptionEnd.Value < now)
        {
            center.Status = CenterStatus.Expired;
        }
        else
        {
            center.Status = request.Status;
        }

        center.UpdatedAt = now;
        await _context.SaveChangesAsync(cancellationToken);

        await _auditLog.WriteAsync(
            action: center.Status == CenterStatus.Suspended ? "SuspendCenter" : "ActivateCenter",
            entityType: "Center",
            entityId: center.Id.ToString(),
            details: $"Center '{center.Name}' status set to {center.Status}",
            cancellationToken: cancellationToken);

        var message = center.Status == CenterStatus.Suspended
            ? "تم إيقاف المركز بنجاح"
            : center.Status == CenterStatus.Expired
                ? "تم تفعيل المركز لكن الاشتراك منتهٍ"
                : "تم تفعيل المركز بنجاح";

        return Success<string>(null, message);
    }

    public async Task<Response<string>> Handle(
        DeleteCenterCommand request,
        CancellationToken cancellationToken)
    {
        var center = await _context.Centers
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(c => c.Id == request.Id, cancellationToken);

        if (center is null || center.IsDeleted)
            return NotFound<string>("المركز غير موجود");

        center.IsDeleted = true;
        center.DeletedAt = DateTime.UtcNow;
        center.DeletedBy = _tenantContext.UserId;

        await _context.SaveChangesAsync(cancellationToken);

        await _auditLog.WriteAsync(
            action: "DeleteCenter",
            entityType: "Center",
            entityId: center.Id.ToString(),
            details: $"Soft deleted center '{center.Name}'",
            cancellationToken: cancellationToken);

        return Success<string>(null, "تم حذف المركز بنجاح");
    }

    public async Task<Response<string>> Handle(
        UpgradeCenterToMultiTeacherCommand request,
        CancellationToken cancellationToken)
    {
        var centerId = _tenantContext.IsUnrestricted
            ? request.CenterId ?? _tenantContext.CenterId
            : _tenantContext.CenterId;

        if (centerId is null)
            return BadRequest<string>("تعذّر تحديد المركز الخاص بك");

        var center = await _context.Centers
            .FirstOrDefaultAsync(c => c.Id == centerId.Value, cancellationToken);

        if (center is null)
            return NotFound<string>("المركز غير موجود");

        if (center.Type == CenterType.MultiTeacher)
            return Success<string>(null, "المركز يدعم إضافة مدرسين بالفعل");

        center.Type = CenterType.MultiTeacher;
        center.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(cancellationToken);

        await _auditLog.WriteAsync(
            action: "UpgradeCenterToMultiTeacher",
            entityType: "Center",
            entityId: center.Id.ToString(),
            details: $"Upgraded center '{center.Name}' to multi-teacher",
            cancellationToken: cancellationToken);

        return Success<string>(null, "تم ترقية حسابك ليتيح إضافة مدرسين");
    }
}

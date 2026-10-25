using CenterManagement.Core.Features.Payments.Queries.Models;
using CenterManagement.Core.Features.Payments.Queries.Results;
using CenterManagement.Data.Entities;
using CenterManagement.Infrustructure.Data;

namespace CenterManagement.Core.Features.Payments.Queries.Handlers;

public class GetPaymentReceiptHandler : ResponseHandler,
    IRequestHandler<GetPaymentReceiptQuery, Response<PaymentReceiptDto>>
{
    private readonly IUserScopeService _scopeService;
    private readonly ITenantContext _tenantContext;
    private readonly AppDbContext _context;

    public GetPaymentReceiptHandler(
        IUserScopeService scopeService,
        ITenantContext tenantContext,
        AppDbContext context,
        IStringLocalizer<SharedResources> stringLocalizer)
        : base(stringLocalizer)
    {
        _scopeService = scopeService;
        _tenantContext = tenantContext;
        _context = context;
    }

    public async Task<Response<PaymentReceiptDto>> Handle(
        GetPaymentReceiptQuery request,
        CancellationToken cancellationToken)
    {
        var scope = await _scopeService.ResolveAsync(cancellationToken);

        // The tenant query filter already hides payments that belong to another
        // center, so a payment of center B can never be read by center A.
        var payment = await _context.Payments
            .AsNoTracking()
            .Include(p => p.Student)
            .Include(p => p.Group)
            .Include(p => p.StudentAmounts)
            .Include(p => p.Session)
            .FirstOrDefaultAsync(p => p.Id == request.PaymentId, cancellationToken);

        // Report a missing payment (or one outside the center) as not found so
        // we never leak the existence of other centers' / teachers' data.
        if (payment is null)
            return NotFound<PaymentReceiptDto>();

        // Teacher / assistant scope: only receipts for the user's own groups.
        if (!scope.Allows(payment.GroupId))
            return NotFound<PaymentReceiptDto>();

        // Resolve the "received by" full name: prefer the snapshot stored on the
        // payment, then the linked user, then the audit creator.
        var receivedByName = payment.ReceivedByName;
        if (string.IsNullOrWhiteSpace(receivedByName))
        {
            var lookupId = payment.ReceivedBy ?? payment.CreatedBy;
            if (lookupId.HasValue)
            {
                receivedByName = await _context.Users
                    .Where(u => u.Id == lookupId.Value)
                    .Select(u => u.FullName)
                    .FirstOrDefaultAsync(cancellationToken);
            }
        }

        // Center branding for the receipt header.
        var centerId = payment.CenterId ?? _tenantContext.CenterId;
        Center? center = null;
        if (centerId.HasValue)
        {
            center = await _context.Centers
                .AsNoTracking()
                .FirstOrDefaultAsync(c => c.Id == centerId.Value, cancellationToken);
        }

        var teacherName = await _context.TeacherGroups
            .Where(tg => tg.GroupId == payment.GroupId)
            .Select(tg => tg.Teacher.FullName)
            .FirstOrDefaultAsync(cancellationToken);

        // A payment normally has a single amount row; aggregate defensively.
        var amounts = payment.StudentAmounts;
        var billingPeriod = payment.BillingPeriod;

        var dto = new PaymentReceiptDto
        {
            PaymentId = payment.Id,
            ReceiptNumber = payment.ReceiptNumber,

            CenterName = center?.Name ?? string.Empty,
            CenterLogoUrl = center?.LogoUrl,
            CenterPhone = center?.Phone,
            CenterAddress = center?.Address,
            CenterThemeColor = center?.ThemeColor,

            StudentName = payment.Student?.FullName ?? string.Empty,
            GroupName = payment.Group?.Name ?? string.Empty,
            TeacherName = teacherName,

            PaymentDate = payment.PaymentDate,
            ReceivedAt = payment.ReceivedAt,
            SubscriptionType = payment.Student?.SubscriptionType ?? default,

            BillingMonth = billingPeriod?.Month,
            BillingYear = billingPeriod?.Year,
            BilledSessions = amounts.Select(a => a.BilledSessions).FirstOrDefault(v => v.HasValue),

            Amount = amounts.Sum(a => a.Amount),
            TotalAmount = amounts.Sum(a => a.TotalAmount),
            PaidAmount = amounts.Sum(a => a.PaidAmount),
            RemainingAmount = amounts.Sum(a => a.RemainingAmount),

            ReceivedBy = payment.ReceivedBy ?? payment.CreatedBy,
            ReceivedByName = receivedByName,

            Notes = payment.Notes
        };

        return Success(dto);
    }
}

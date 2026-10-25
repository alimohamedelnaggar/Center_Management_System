using CenterManagement.Data.Enums;

namespace CenterManagement.Core.Features.Payments.Queries.Results;

/// <summary>
/// Everything needed to render a printable payment receipt. <see cref="ReceiptNumber"/>
/// is null for legacy payments that predate receipt numbering (the UI must show
/// "-" and never a GUID). <see cref="ReceivedByName"/> falls back to the recorded
/// user's full name and is null when unknown.
/// </summary>
public class PaymentReceiptDto
{
    public Guid PaymentId { get; set; }

    public int? ReceiptNumber { get; set; }

    // ---- Center branding ----
    public string CenterName { get; set; } = default!;
    public string? CenterLogoUrl { get; set; }
    public string? CenterPhone { get; set; }
    public string? CenterAddress { get; set; }
    public string? CenterThemeColor { get; set; }

    // ---- Student / group ----
    public string StudentName { get; set; } = default!;
    public string GroupName { get; set; } = default!;
    public string? TeacherName { get; set; }

    // ---- Payment ----
    public DateTime PaymentDate { get; set; }
    public DateTime ReceivedAt { get; set; }

    public SubscriptionType SubscriptionType { get; set; }

    /// <summary>Month (1-12) the payment covers, when it is a monthly payment.</summary>
    public int? BillingMonth { get; set; }

    /// <summary>Year the payment covers, when it is a monthly payment.</summary>
    public int? BillingYear { get; set; }

    public int? BilledSessions { get; set; }

    public decimal Amount { get; set; }
    public decimal TotalAmount { get; set; }
    public decimal PaidAmount { get; set; }
    public decimal RemainingAmount { get; set; }

    // ---- Who recorded it ----
    public Guid? ReceivedBy { get; set; }
    public string? ReceivedByName { get; set; }

    public string? Notes { get; set; }
}

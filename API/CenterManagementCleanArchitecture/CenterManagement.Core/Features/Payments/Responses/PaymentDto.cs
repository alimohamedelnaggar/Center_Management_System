namespace CenterManagement.Core.Features.Payments.Queries.Results;

public class PaymentDto
{
    public Guid PaymentId { get; set; }

    public string StudentName { get; set; } = default!;
    public Guid StudentId { get; set; }
    public Guid GroupId { get; set; }


    public string GroupName { get; set; } = default!;

    public DateTime PaymentDate { get; set; }

    public decimal Amount { get; set; }

    public decimal TotalAmount { get; set; }

    public decimal PaidAmount { get; set; }

    public decimal RemainingAmount { get; set; }

    public PaymentStatus Status { get; set; }

    public DateOnly? BillingPeriod { get; set; }

    public Guid? SessionId { get; set; }

    public SubscriptionType SubscriptionType { get; set; }


    public string? Notes { get; set; }

    /// <summary>User who recorded the payment.</summary>
    public Guid? CreatedBy { get; set; }

    /// <summary>Name of the user who recorded the payment ("received by").</summary>
    public string? ReceivedByName { get; set; }
}
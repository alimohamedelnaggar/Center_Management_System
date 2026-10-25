public sealed class GetPaymentsPaginatedResponse
{
    public Guid Id { get; set; }

    public Guid StudentId { get; set; }

    public Guid GroupId { get; set; }

    public string StudentName { get; set; } = default!;

    public string GroupName { get; set; } = default!;

    public SubscriptionType SubscriptionType { get; set; }

    public decimal Amount { get; set; }

    public DateTime PaymentDate { get; set; }

    public DateOnly? BillingPeriod { get; set; }

    public Guid? SessionId { get; set; }

    public string? SessionName { get; set; }

    public string? Notes { get; set; }

    /// <summary>User who recorded the payment (teacher / assistant / owner).</summary>
    public Guid? CreatedBy { get; set; }

    /// <summary>Name of the user who recorded the payment ("received by").</summary>
    public string? ReceivedByName { get; set; }
}
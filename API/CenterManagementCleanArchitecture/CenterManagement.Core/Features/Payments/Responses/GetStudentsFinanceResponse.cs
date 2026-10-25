public sealed class GetStudentsFinanceResponse
{
    public Guid StudentId { get; set; }
    public Guid GroupId { get; set; }

    public string StudentName { get; set; } = default!;

    public string GroupName { get; set; } = default!;

    public SubscriptionType SubscriptionType { get; set; }

    public decimal? LastPaymentAmount { get; set; }

    public DateTime? LastPaymentDate { get; set; }

    public DateOnly? BillingPeriod { get; set; }

    public decimal TotalAmount { get; set; }

    public decimal PaidAmount { get; set; }

    public decimal RemainingAmount { get; set; }

    public PaymentStatus Status { get; set; }

    public bool IsPaid { get; set; }
    public bool IsPaidAlways { get; set; }

    // =========================================================
    // Subscription start (added for the "pre-join month" rule)
    // =========================================================
    // False when the selected billing month is earlier than the month the
    // student joined the group. In that case nothing is due: no unpaid flag,
    // no remaining amount. Status is PaymentStatus.NotApplicable.
    public bool IsBillingApplicable { get; set; } = true;

    // The billing month the student started owing from (their group JoinDate month).
    public DateOnly? BillingStartPeriod { get; set; }

    // Backend-generated Arabic label, e.g. "بدأ في نوفمبر 2026".
    // Null while the month is applicable.
    public string? BillingStatusLabel { get; set; }

    public bool JoinedAfterBillingPeriod { get; set; }

    public DateTime? JoinDate { get; set; }
}
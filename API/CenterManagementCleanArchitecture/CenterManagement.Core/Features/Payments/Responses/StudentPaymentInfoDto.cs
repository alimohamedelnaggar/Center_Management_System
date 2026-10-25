public class StudentPaymentInfoDto
{
    public Guid StudentId { get; set; }
    public string StudentName { get; set; } = default!;
    public Guid GroupId { get; set; }
    public string GroupName { get; set; } = default!;
    public SubscriptionType SubscriptionType { get; set; }

     public decimal MonthlyPrice { get; set; }

    public decimal GroupMonthlyPrice { get; set; }
    public bool HasDiscount { get; set; }
    public decimal DiscountAmount { get; set; }

    public int SessionsPerMonth { get; set; }
    public decimal PricePerSession { get; set; }
    public int AttendedSessions { get; set; }
    public int BilledSessions { get; set; }
    public bool IsFullMonth { get; set; }

    public decimal TotalAmount { get; set; }
    public decimal PreviouslyPaid { get; set; }
    public decimal RemainingAmount { get; set; }

    public string CalculationText { get; set; } = string.Empty;
}
public class FinancialReportDto
{
    public Guid? StudentId { get; set; }
    public DateOnly? BillingPeriod { get; set; }
    public DateTime PaymentDate { get; set; }
    public decimal Amount { get; set; }
    public decimal TotalAmount { get; set; }
    public decimal PaidAmount { get; set; }
    public decimal RemainingAmount { get; set; }
    public PaymentStatus Status { get; set; }
    public string? Notes { get; set; }
}
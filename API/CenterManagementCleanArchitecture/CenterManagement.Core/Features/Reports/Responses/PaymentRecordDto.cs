public class PaymentRecordDto
{
    public DateTime PaymentDate { get; set; }

    public decimal Amount { get; set; }

    public DateOnly? BillingPeriod { get; set; }

    public DayOfWeek? DayOfWeek { get; set; }

    public TimeOnly? StartTime { get; set; }

    public TimeOnly? EndTime { get; set; }

    public string? Notes { get; set; }
}
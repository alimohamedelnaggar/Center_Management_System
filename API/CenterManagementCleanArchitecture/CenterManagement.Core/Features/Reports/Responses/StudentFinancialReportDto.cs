public sealed class StudentFinancialReportDto
{
    public Guid StudentId { get; set; }

    public string StudentName { get; set; } = string.Empty;

    public string GroupName { get; set; } = string.Empty;

    public SubscriptionType SubscriptionType { get; set; }

    public decimal TotalPaid { get; set; }

    public int PaymentsCount { get; set; }

    public List<PaymentRecordDto> Payments { get; set; } = [];
}
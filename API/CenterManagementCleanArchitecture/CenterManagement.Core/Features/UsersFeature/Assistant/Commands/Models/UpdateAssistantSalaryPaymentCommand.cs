public class UpdateAssistantSalaryPaymentCommand : IRequest<Response<string>>
{
    public Guid PaymentId { get; set; }

    // المبلغ الفعلي المُصرف في هذه العملية
    public decimal Amount { get; set; }

    // تاريخ الصرف الفعلي
    public DateTime? PaidAt { get; set; }

    public string? Notes { get; set; }
}

public class PayAssistantSalaryCommand : IRequest<Response<string>>
{
    public Guid AssistantId { get; set; }

    public int Month { get; set; }

    public int Year { get; set; }

    // المبلغ المراد صرفه في هذه العملية (يسمح بالصرف الجزئي)
    // عند تركه فارغ يتم صرف كامل المتبقي
    public decimal? Amount { get; set; }

    public decimal? Bonus { get; set; }

    public decimal? Deduction { get; set; }

    // تاريخ الصرف الفعلي
    public DateTime? PaidAt { get; set; }

    public string? Notes { get; set; }
}
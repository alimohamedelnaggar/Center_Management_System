public static class AssistantSalaryStatusNames
{
    public const string All = "all";

    public const string Paid = "paid";

    public const string Partial = "partial";

    public const string Unpaid = "unpaid";
}

// حالة صرف مرتب مساعد واحد خلال شهر محدد
public class AssistantSalaryStatusDto
{
    public Guid Id { get; set; }

    public string FullName { get; set; } = default!;

    public string? PhoneNumber { get; set; }

    // المرتب الأساسي
    public decimal Salary { get; set; }

    // الشهر المختار
    public int Month { get; set; }

    public int Year { get; set; }

    // إجمالي ما تم صرفه خلال الشهر
    public decimal Paid { get; set; }

    // المتبقي من المرتب
    public decimal Remaining { get; set; }

    // unpaid | partial | paid
    public string Status { get; set; } = AssistantSalaryStatusNames.Unpaid;

    // عدد عمليات الصرف خلال الشهر
    public int PaymentsCount { get; set; }

    // تاريخ آخر عملية صرف خلال الشهر
    public DateTime? LastPaymentDate { get; set; }
}

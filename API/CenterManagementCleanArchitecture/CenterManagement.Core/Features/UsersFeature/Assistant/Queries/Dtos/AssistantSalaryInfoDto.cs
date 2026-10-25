
public class AssistantSalaryInfoDto
{
    public Guid AssistantId { get; set; }

    public string FullName { get; set; } = default!;

    public string? PhoneNumber { get; set; }

    // المرتب الحالي
    public decimal Salary { get; set; }

    // إجمالي ما تم دفعه خلال كل الأشهر
    public decimal TotalPaid { get; set; }

    // سجل المرتبات مجمعاً حسب الشهر
    // (لا يوجد شهر بدون عمليات صرف)
    public List<AssistantSalaryMonthDto> Months { get; set; } = [];
}

// مرتبات مساعد خلال شهر واحد مع كل عمليات الصرف الخاصة به
public class AssistantSalaryMonthDto
{
    public int Month { get; set; }

    public int Year { get; set; }

    // المرتب الأساسي وقت صرف آخر عملية في هذا الشهر
    public decimal BasicSalary { get; set; }

    // إجمالي ما تم دفعه خلال الشهر
    public decimal TotalPaid { get; set; }

    // المتبقي من مرتب الشهر
    public decimal Remaining { get; set; }

    // unpaid | partial | paid
    public string Status { get; set; } = AssistantSalaryStatusNames.Unpaid;

    // عدد عمليات الصرف خلال الشهر
    public int PaymentsCount { get; set; }

    // عمليات الصرف الخاصة بهذا الشهر
    public List<AssistantPaymentDto> Operations { get; set; } = [];
}

public class AssistantPaymentDto
{
    public Guid Id { get; set; }

    // الشهر المستحق
    public int Month { get; set; }

    public int Year { get; set; }

    // المرتب الأساسي وقت القبض
    public decimal BasicSalary { get; set; }

    // الإضافات
    public decimal Bonus { get; set; }

    // الخصومات
    public decimal Deduction { get; set; }

    // الصافي
    public decimal NetSalary { get; set; }

    // هل قبض؟
    public bool IsPaid { get; set; }

    // تاريخ القبض الفعلي
    public DateTime? PaidAt { get; set; }

    // من قام بصرف/تسجيل المرتب
    public Guid? CreatedBy { get; set; }

    // اسم المستلم (الذي سجّل الصرف)
    public string? ReceivedByName { get; set; }

    public string? Notes { get; set; }
}

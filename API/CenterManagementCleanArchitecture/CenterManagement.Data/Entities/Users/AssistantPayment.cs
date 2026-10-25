using CenterManagement.Data.Entities;
using CenterManagement.Data.Entities.Users;

public class AssistantPayment : BaseEntity, ITenantEntity
{
    public Guid AssistantId { get; set; }
    public Assistent Assistant { get; set; } = default!;

    // الشهر المستحق
    public int Month { get; set; }
    public int Year { get; set; }

    // المرتب الأساسي وقت القبض
    public decimal BasicSalary { get; set; }

    // إضافات
    public decimal? Bonus { get; set; }

    // خصومات
    public decimal? Deduction { get; set; }

    // الصافي
    public decimal NetSalary { get; set; }

    // هل قبض؟
    public bool IsPaid { get; set; }

    // تاريخ القبض
    public DateTime? PaidAt { get; set; }

    public string? Notes { get; set; }

    public Guid? CenterId { get; set; }
}
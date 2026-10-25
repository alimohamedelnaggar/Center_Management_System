using CenterManagement.Data.Entities.Groups;
using CenterManagement.Data.Entities.Users;

namespace CenterManagement.Data.Entities;

public class Payment : BaseEntity, ITenantEntity
{
    public Guid StudentId { get; set; }
    public Student Student { get; set; } = default!;

    public Guid GroupId { get; set; }
    public Group Group { get; set; } = default!;

    public Guid? SessionId { get; set; }
    public Session? Session { get; set; } = default!;

    public DateTime PaymentDate { get; set; } = DateTime.Now;
    public DateOnly? BillingPeriod { get; set; }

    public string? Notes { get; set; }

    public ICollection<StudentAmount> StudentAmounts { get; set; } = new HashSet<StudentAmount>();

    public Guid? CenterId { get; set; }

    public Guid? ReceivedBy { get; set; }

    public string? ReceivedByName { get; set; }

    public DateTime ReceivedAt { get; set; } = DateTime.UtcNow;

    public int? ReceiptNumber { get; set; }
}

public class CenterReceiptCounter
{
    public Guid CenterId { get; set; }
    public int LastNumber { get; set; }
}

public class StudentAmount : BaseEntity, ITenantEntity
{
    public Guid PaymentId { get; set; }

    public Payment Payment { get; set; } = default!;

    public decimal Amount { get; set; }

    public decimal TotalAmount { get; set; }

    public decimal PaidAmount { get; set; }
    public int? BilledSessions { get; set; }
    public decimal RemainingAmount { get; set; }

    public PaymentStatus Status { get; set; }

    public Guid? CenterId { get; set; }
}
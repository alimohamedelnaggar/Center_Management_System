using CenterManagement.Data.Entities.Identity;

namespace CenterManagement.Data.Entities.Users;

public class Assistent : User, ITenantEntity
{
    public decimal Salary { get; set; }

    public int? WorkingHoursPerWeek { get; set; }

    public DateOnly? HireDate { get; set; }

    public string? NationalId { get; set; }

    public string? Address { get; set; }

    public string? Notes { get; set; }
    public Guid? CenterId { get; set; }
    public virtual Center? Center { get; set; }

    // Optional link to a teacher. When set, the assistant is limited to that
    // teacher's groups; when null the assistant works center-wide.
    public Guid? TeacherId { get; set; }
    public virtual User? Teacher { get; set; }

    public ICollection<AssistantPayment> AssistantPayments { get; set; } = [];
}

namespace CenterManagement.Data.Entities.Expenses;

public class Expense : BaseEntity, ITenantEntity
{
    public string Name { get; set; } = default!;

    public Guid CategoryId { get; set; }
    public ExpenseCategory Category { get; set; } = default!;

    public decimal Amount { get; set; }

    public DateOnly ExpenseDate { get; set; }

    public string? Notes { get; set; }

    public Guid? CenterId { get; set; }
}

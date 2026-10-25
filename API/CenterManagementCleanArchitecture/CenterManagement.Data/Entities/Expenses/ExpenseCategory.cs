namespace CenterManagement.Data.Entities.Expenses;

public class ExpenseCategory : BaseEntity, ITenantEntity
{
    public string Name { get; set; } = default!;
    public ICollection<Expense> Expenses { get; set; } = new List<Expense>();
    public Guid? CenterId { get; set; }
}
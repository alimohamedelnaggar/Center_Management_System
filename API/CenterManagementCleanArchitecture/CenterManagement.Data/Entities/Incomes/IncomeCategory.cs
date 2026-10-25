namespace CenterManagement.Data.Entities.Incomes;

public class IncomeCategory : BaseEntity, ITenantEntity
{
    public string Name { get; set; } = default!;
    public ICollection<Income> Incomes { get; set; } = new List<Income>();
    public Guid? CenterId { get; set; }
}
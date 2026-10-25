namespace CenterManagement.Data.Entities.Incomes;

public class Income : BaseEntity, ITenantEntity
{
    public string Name { get; set; } = default!;

    public Guid CategoryId { get; set; }
    public IncomeCategory Category { get; set; } = default!;

    public decimal Amount { get; set; }

    public DateOnly IncomeDate { get; set; }

    public string? Notes { get; set; }

    /// <summary>
    /// The group this income belongs to. Center-wide income (recorded by the
    /// owner or a solo teacher) may leave it empty; a regular teacher records
    /// income against one of his own groups so it stays scoped to him.
    /// </summary>
    public Guid? GroupId { get; set; }

    public Guid? CenterId { get; set; }
}
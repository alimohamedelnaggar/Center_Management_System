namespace CenterManagement.Core.Features.IncomeFeature.Queries.Results;

public class IncomeDTO
{
    public Guid Id { get; set; }
    public string Name { get; set; } = default!;
    public string CategoryName { get; set; } = default!;
    public Guid CategoryId { get; set; }
    public decimal Amount { get; set; }
    public DateOnly IncomeDate { get; set; }
    public string? Notes { get; set; }
    public Guid? GroupId { get; set; }
}
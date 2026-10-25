namespace CenterManagement.Core.Features.ExpenseFeature.Students.Queries.Results;

public class ExpenseDTO
{
    public Guid Id { get; set; }
    public string Name { get; set; } = default!;
    public string CategoryName { get; set; } = default!;
    public Guid CategoryId { get; set; }
    public decimal Amount { get; set; }
    public DateOnly ExpenseDate { get; set; }
    public string? Notes { get; set; }
}
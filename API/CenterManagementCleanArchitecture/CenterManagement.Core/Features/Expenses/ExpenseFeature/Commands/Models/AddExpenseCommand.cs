namespace CenterManagement.Core.Features.ExpenseFeature.Students.Commands.Models;


public sealed record AddExpenseCommand(
    string Name,
    Guid CategoryId,
    decimal Amount,
    DateOnly ExpenseDate,
    string? Notes
) : IRequest<Response<string>>;


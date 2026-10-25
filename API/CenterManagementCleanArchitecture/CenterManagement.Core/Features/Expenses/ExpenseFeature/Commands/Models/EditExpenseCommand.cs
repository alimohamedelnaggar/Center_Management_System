namespace CenterManagement.Core.Features.ExpenseFeature.Students.Commands.Models;

public sealed record EditExpenseCommand(
    Guid Id,
    string Name,
    Guid CategoryId,
    decimal Amount,
    DateOnly ExpenseDate,
    string? Notes
) : IRequest<Response<string>>;
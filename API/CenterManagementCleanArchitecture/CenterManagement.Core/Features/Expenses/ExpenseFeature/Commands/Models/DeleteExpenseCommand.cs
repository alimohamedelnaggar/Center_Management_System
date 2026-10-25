namespace CenterManagement.Core.Features.ExpenseFeature.Students.Commands.Models;


public sealed record DeleteExpenseCommand(Guid Id)
    : IRequest<Response<string>>;
namespace CenterManagement.Core.Features.ExpenseCategoryFeature.Students.Commands.Models;

public sealed record EditExpenseCategoryCommand(
    Guid Id,
    string Name
) : IRequest<Response<string>>;
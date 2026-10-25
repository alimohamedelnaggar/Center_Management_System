namespace CenterManagement.Core.Features.ExpenseCategoryFeature.Students.Commands.Models;


public sealed record AddExpenseCategoryCommand(
    string Name
) : IRequest<Response<string>>;


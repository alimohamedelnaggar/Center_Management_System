namespace CenterManagement.Core.Features.ExpenseCategoryFeature.Students.Commands.Models;


public sealed record DeleteExpenseCategoryCommand(Guid Id)
    : IRequest<Response<string>>;
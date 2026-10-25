using CenterManagement.Core.Features.ExpenseCategoryFeature.Students.Commands.Models;

namespace CenterManagement.Core.Features.ExpenseCategoryFeature.Commands.Validators;

public sealed class DeleteExpenseCategoryValidator
    : AbstractValidator<DeleteExpenseCategoryCommand>
{
    public DeleteExpenseCategoryValidator()
    {
        RuleFor(x => x.Id)
            .NotEmpty();
    }
}
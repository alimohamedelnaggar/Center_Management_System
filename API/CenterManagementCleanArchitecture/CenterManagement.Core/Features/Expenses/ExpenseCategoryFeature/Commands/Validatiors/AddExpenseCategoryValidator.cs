using CenterManagement.Core.Features.ExpenseCategoryFeature.Students.Commands.Models;

namespace CenterManagement.Core.Features.ExpenseFeature.Commands.Validators;

public sealed class AddExpenseCategoryValidator
    : AbstractValidator<AddExpenseCategoryCommand>
{
    public AddExpenseCategoryValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty()
            .MaximumLength(200);

    }
}

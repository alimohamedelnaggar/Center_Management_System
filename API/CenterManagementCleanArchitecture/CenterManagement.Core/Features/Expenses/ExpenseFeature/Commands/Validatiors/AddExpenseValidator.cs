using CenterManagement.Core.Features.ExpenseFeature.Students.Commands.Models;

namespace CenterManagement.Core.Features.ExpenseFeature.Commands.Validators;

public sealed class AddExpenseValidator
    : AbstractValidator<AddExpenseCommand>
{
    public AddExpenseValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty()
            .MaximumLength(200);

        RuleFor(x => x.CategoryId)
            .NotEmpty();

        RuleFor(x => x.Amount)
            .GreaterThan(0);

        RuleFor(x => x.ExpenseDate)
            .NotEmpty();
    }
}

using CenterManagement.Core.Features.ExpenseFeature.Students.Commands.Models;

namespace CenterManagement.Core.Features.ExpenseFeature.Commands.Validators;

public sealed class DeleteExpenseValidator
    : AbstractValidator<DeleteExpenseCommand>
{
    public DeleteExpenseValidator()
    {
        RuleFor(x => x.Id)
            .NotEmpty();
    }
}
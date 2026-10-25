using CenterManagement.Core.Features.ExpenseCategoryFeature.Students.Commands.Models;

namespace CenterManagement.Core.Features.ExpenseCategoryFeature.Commands.Validators;

public sealed class EditExpenseCategoryValidator : AbstractValidator<EditExpenseCategoryCommand>
{
    public EditExpenseCategoryValidator()
    {
        RuleFor(x => x.Id)
            .NotEmpty();

        RuleFor(x => x.Name)
            .NotEmpty()
            .MaximumLength(200);

    }
}

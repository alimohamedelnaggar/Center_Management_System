public class PayAssistantSalaryValidator
    : AbstractValidator<PayAssistantSalaryCommand>
{
    public PayAssistantSalaryValidator()
    {
        RuleFor(x => x.AssistantId)
            .NotEmpty();

        RuleFor(x => x.Month)
            .InclusiveBetween(1, 12);

        RuleFor(x => x.Year)
            .GreaterThanOrEqualTo(2025);

        RuleFor(x => x.Amount)
            .GreaterThan(0)
            .When(x => x.Amount.HasValue);

        RuleFor(x => x.Bonus)
            .GreaterThanOrEqualTo(0)
            .When(x => x.Bonus.HasValue);

        RuleFor(x => x.Deduction)
            .GreaterThanOrEqualTo(0)
            .When(x => x.Deduction.HasValue);
    }
}
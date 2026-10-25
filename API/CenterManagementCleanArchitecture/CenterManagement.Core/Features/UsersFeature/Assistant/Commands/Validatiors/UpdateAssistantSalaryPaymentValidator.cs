public class UpdateAssistantSalaryPaymentValidator
    : AbstractValidator<UpdateAssistantSalaryPaymentCommand>
{
    public UpdateAssistantSalaryPaymentValidator()
    {
        RuleFor(x => x.PaymentId)
            .NotEmpty();

        RuleFor(x => x.Amount)
            .GreaterThan(0);
    }
}

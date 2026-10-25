public class DeleteAssistantSalaryPaymentValidator
    : AbstractValidator<DeleteAssistantSalaryPaymentCommand>
{
    public DeleteAssistantSalaryPaymentValidator()
    {
        RuleFor(x => x.PaymentId)
            .NotEmpty();
    }
}

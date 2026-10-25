public class DeleteAssistantSalaryPaymentCommand : IRequest<Response<string>>
{
    public Guid PaymentId { get; set; }
}

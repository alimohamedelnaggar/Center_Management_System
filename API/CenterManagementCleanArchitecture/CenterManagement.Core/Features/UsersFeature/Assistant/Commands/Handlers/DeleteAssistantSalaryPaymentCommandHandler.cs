using CenterManagement.Core.Bases;
using CenterManagement.Infrustructure.InfrastructureBases.Bases;
using Microsoft.Extensions.Localization;

namespace CenterManagement.Core.Features.UsersFeature.AssistantPayments.Commands.Handlers;

public sealed class DeleteAssistantSalaryPaymentCommandHandler
    : ResponseHandler,
      IRequestHandler<DeleteAssistantSalaryPaymentCommand, Response<string>>
{
    private readonly IRepositoryManager _repositoryManager;

    public DeleteAssistantSalaryPaymentCommandHandler(
        IRepositoryManager repositoryManager,
        IStringLocalizer<SharedResources> localizer)
        : base(localizer)
    {
        _repositoryManager = repositoryManager;
    }

    public async Task<Response<string>> Handle(
        DeleteAssistantSalaryPaymentCommand request,
        CancellationToken cancellationToken)
    {
        var payment = await _repositoryManager
            .AssistantPaymentRepository
            .GetPaymentByIdAsync(request.PaymentId, cancellationToken);

        if (payment is null)
            return NotFound<string>("عملية صرف المرتب غير موجودة.");

        await _repositoryManager
            .AssistantPaymentRepository
            .DeleteAsync(payment);

        await _repositoryManager.SaveChangesAsync();

        return Success("تم حذف عملية صرف المرتب بنجاح.");
    }
}

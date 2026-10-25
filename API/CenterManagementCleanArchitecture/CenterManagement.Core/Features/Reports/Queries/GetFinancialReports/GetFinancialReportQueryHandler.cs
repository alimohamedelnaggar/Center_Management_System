using CenterManagement.Infrustructure.InfrastructureBases.Bases;

namespace CenterManagement.Core.Features.Payments.Queries.Handlers;

public class GetFinancialReportQueryHandler : ResponseHandler,
    IRequestHandler<GetFinancialReportQuery, Response<List<FinancialReportDto>>>
{
    private readonly IRepositoryManager _repository;
    private readonly IUserScopeService _scopeService;

    public GetFinancialReportQueryHandler(
        IRepositoryManager repository,
        IUserScopeService scopeService,
        IStringLocalizer<SharedResources> stringLocalizer)
        : base(stringLocalizer)
    {
        _repository = repository;
        _scopeService = scopeService;
    }

    public async Task<Response<List<FinancialReportDto>>> Handle(
        GetFinancialReportQuery request,
        CancellationToken cancellationToken)
    {
        var student = await _repository.StudentRepository
            .GetByIdAsync(request.StudentId);

        if (student is null)
            return NotFound<List<FinancialReportDto>>("الطالب غير موجود.");

        if (!await _scopeService.AllowsStudentAsync(request.StudentId, cancellationToken))
            return Forbidden<List<FinancialReportDto>>();

        var payments = await _repository.PaymentRepository
            .GetStudentPaymentsAsync(request.StudentId, cancellationToken);

        if (request.GroupId.HasValue)
        {
            payments = payments
                .Where(p => p.GroupId == request.GroupId.Value)
                .ToList();
        }

        var result = payments
            .SelectMany(payment => payment.StudentAmounts.Select(amount => new FinancialReportDto
            {
                PaymentDate = payment.PaymentDate,
                BillingPeriod = payment.BillingPeriod,
                Amount = amount.Amount,
                TotalAmount = amount.TotalAmount,
                PaidAmount = amount.PaidAmount,
                RemainingAmount = amount.RemainingAmount,
                Status = amount.Status,
                Notes = payment.Notes
            }))
            .ToList();

        return Success(result);
    }
}
using CenterManagement.Core.Features.Payments.Queries.Models;
using CenterManagement.Core.Features.Payments.Queries.Results;
using CenterManagement.Infrustructure.Data;
using CenterManagement.Infrustructure.InfrastructureBases.Bases;

namespace CenterManagement.Core.Features.Payments.Queries.Handlers;

public class GetPaymentsHandler : ResponseHandler,
    IRequestHandler<GetPaymentsQuery, Response<List<PaymentDto>>>
{
    private readonly IRepositoryManager _repository;
    private readonly IUserScopeService _scopeService;
    private readonly AppDbContext _context;

    public GetPaymentsHandler(IRepositoryManager repository, IUserScopeService scopeService, AppDbContext context, IStringLocalizer<SharedResources> stringLocalizer) : base(stringLocalizer)
    {
        _repository = repository;
        _scopeService = scopeService;
        _context = context;
    }

    public async Task<Response<List<PaymentDto>>> Handle(
        GetPaymentsQuery request,
        CancellationToken cancellationToken)
    {
        var scope = await _scopeService.ResolveAsync(cancellationToken);

        var payments = await _repository.PaymentRepository.GetAllPaymentsAsync();

        if (!scope.CenterWide)
            payments = payments.Where(p => scope.Allows(p.GroupId)).ToList();

        var result = payments.SelectMany(payment =>
            payment.StudentAmounts.Select(amount => new PaymentDto
            {
                PaymentId = payment.Id,
                StudentName = payment.Student.FullName,
                StudentId = payment.StudentId,
                GroupId = payment.GroupId,
                GroupName = payment.Group.Name,
                PaymentDate = payment.PaymentDate,
                BillingPeriod = payment.BillingPeriod,
                SubscriptionType = payment.Student.SubscriptionType,
                SessionId = payment.Session?.Id ?? payment.SessionId,
                Notes = payment.Notes,
                CreatedBy = payment.CreatedBy,

                Amount = amount.Amount,
                TotalAmount = amount.TotalAmount,
                PaidAmount = amount.PaidAmount,
                RemainingAmount = amount.RemainingAmount,
                Status = amount.Status
            }))
            .ToList();

        // ==============================
        // Resolve "received by" names
        // ==============================
        var receivedByIds = result
            .Where(r => r.CreatedBy.HasValue)
            .Select(r => r.CreatedBy!.Value)
            .Distinct()
            .ToList();

        if (receivedByIds.Count > 0)
        {
            var receivedByNames = await _context.Users
                .Where(u => receivedByIds.Contains(u.Id))
                .Select(u => new { u.Id, u.FullName })
                .ToDictionaryAsync(u => u.Id, u => u.FullName, cancellationToken);

            foreach (var dto in result)
            {
                if (dto.CreatedBy.HasValue
                    && receivedByNames.TryGetValue(dto.CreatedBy.Value, out var name))
                {
                    dto.ReceivedByName = name;
                }
            }
        }

        return Success(result);
    }
}

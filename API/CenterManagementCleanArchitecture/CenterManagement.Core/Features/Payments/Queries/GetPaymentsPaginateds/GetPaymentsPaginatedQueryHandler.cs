using CenterManagement.Core.Features.Payments.Queries.Models;
using CenterManagement.Core.Features.Payments.Queries.Results;
using CenterManagement.Data.Enums;
using CenterManagement.Infrustructure.Data;
using CenterManagement.Infrustructure.InfrastructureBases.Bases;
using Microsoft.EntityFrameworkCore;

namespace CenterManagement.Core.Features.Payments.Queries.Handlers;

public sealed class GetPaymentsPaginatedQueryHandler
    : ResponseHandler,
      IRequestHandler<
          GetPaymentsPaginatedQuery,
          PaginatedResult<GetPaymentsPaginatedResponse>>
{
    private readonly IRepositoryManager _repositoryManager;
    private readonly IUserScopeService _scopeService;
    private readonly AppDbContext _context;

    public GetPaymentsPaginatedQueryHandler(
        IRepositoryManager repositoryManager,
        IUserScopeService scopeService,
        AppDbContext context,
        IStringLocalizer<SharedResources> stringLocalizer)
        : base(stringLocalizer)
    {
        _repositoryManager = repositoryManager;
        _scopeService = scopeService;
        _context = context;
    }

    public async Task<PaginatedResult<GetPaymentsPaginatedResponse>> Handle(
        GetPaymentsPaginatedQuery request,
        CancellationToken cancellationToken)
    {
        var scope = await _scopeService.ResolveAsync(cancellationToken);

        var query = _repositoryManager.PaymentRepository
            .GetPaymentAmountsQuery()
            .ScopeToUser(scope);

        // ==============================
        // Search
        // ==============================
        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var search = request.Search.Trim();

            query = query.Where(x =>
                x.Payment.Student.FullName.Contains(search));
        }

        // ==============================
        // Group Filter
        // ==============================
        if (request.GroupId.HasValue)
        {
            query = query.Where(x =>
                x.Payment.GroupId == request.GroupId.Value);
        }

        // ==============================
        // Subscription Type Filter
        // ==============================
        if (request.SubscriptionType.HasValue)
        {
            query = query.Where(x =>
                x.Payment.Student.SubscriptionType ==
                request.SubscriptionType.Value);
        }

        // ==============================
        // Total Count
        // ==============================
        var totalCount = await query.CountAsync(cancellationToken);

        // ==============================
        // Pagination
        // ==============================
        var studentAmounts = await query
            .OrderByDescending(x => x.Payment.PaymentDate)
            .ThenByDescending(x => x.Payment.Id)
            .Skip((request.PageNumber - 1) * request.PageSize)
            .Take(request.PageSize)
            .ToListAsync(cancellationToken);

        // ==============================
        // "Received by" names
        // ==============================
        var receivedByIds = studentAmounts
            .Select(x => x.Payment.CreatedBy)
            .Where(id => id.HasValue)
            .Select(id => id!.Value)
            .Distinct()
            .ToList();

        var receivedByNames = receivedByIds.Count == 0
            ? new Dictionary<Guid, string>()
            : await _context.Users
                .Where(u => receivedByIds.Contains(u.Id))
                .Select(u => new { u.Id, u.FullName })
                .ToDictionaryAsync(u => u.Id, u => u.FullName, cancellationToken);

        // ==============================
        // Mapping
        // ==============================
        var response = studentAmounts
     .Select(x => new GetPaymentsPaginatedResponse
     {
         Id = x.Payment.Id,
         StudentId = x.Payment.StudentId,
         StudentName = x.Payment.Student.FullName,
         GroupId = x.Payment.GroupId,
         GroupName = x.Payment.Group.Name,
         SubscriptionType = x.Payment.Student.SubscriptionType,
         Amount = x.Amount,
         PaymentDate = x.Payment.PaymentDate,
         BillingPeriod = x.Payment.BillingPeriod,
         SessionId = x.Payment.Session?.Id ?? x.Payment.SessionId,
         SessionName = x.Payment.Session is null
             ? null
             : $"{x.Payment.Session.DayOfWeek} ({x.Payment.Session.StartTime:hh\\:mm})",
         Notes = x.Payment.Notes,
         CreatedBy = x.Payment.CreatedBy,
         ReceivedByName = x.Payment.CreatedBy.HasValue
             && receivedByNames.ContainsKey(x.Payment.CreatedBy.Value)
                 ? receivedByNames[x.Payment.CreatedBy.Value]
                 : null
     })
     .ToList();

        return PaginatedResult<GetPaymentsPaginatedResponse>.Success(
            response,
            totalCount,
            request.PageNumber,
            request.PageSize);
    }
}

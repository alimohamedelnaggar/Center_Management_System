using CenterManagement.Core.Features.UsersFeature.Assistant.Queries.Models;
using CenterManagement.Infrustructure.InfrastructureBases.Bases;

namespace CenterManagement.Core.Features.UsersFeature.Assistant.Queries.Handlers;

public sealed class GetAssistantsSalaryStatusQueryHandler
    : ResponseHandler,
      IRequestHandler<
          GetAssistantsSalaryStatusQuery,
          Response<List<AssistantSalaryStatusDto>>>
{
    private readonly IRepositoryManager _repositoryManager;

    public GetAssistantsSalaryStatusQueryHandler(
        IRepositoryManager repositoryManager,
        IStringLocalizer<SharedResources> localizer)
        : base(localizer)
    {
        _repositoryManager = repositoryManager;
    }

    public async Task<Response<List<AssistantSalaryStatusDto>>> Handle(
        GetAssistantsSalaryStatusQuery request,
        CancellationToken cancellationToken)
    {
        if (request.Month < 1 || request.Month > 12)
            return BadRequest<List<AssistantSalaryStatusDto>>("الشهر غير صحيح.");

        if (request.Year < 2025)
            return BadRequest<List<AssistantSalaryStatusDto>>("السنة غير صحيحة.");

        var month = request.Month;
        var year = request.Year;

        var query = await _repositoryManager.AssistantRepository
            .GetAssistantsQueryableAsync();

        query = query.Where(x => x.IsActive);

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var search = request.Search.Trim();

            query = query.Where(x =>
                x.FullName.Contains(search) ||
                (x.PhoneNumber != null && x.PhoneNumber.Contains(search)));
        }

        var items = await query
            .OrderBy(x => x.FullName)
            .Select(x => new AssistantSalaryStatusDto
            {
                Id = x.Id,
                FullName = x.FullName,
                PhoneNumber = x.PhoneNumber,
                Salary = x.Salary,

                Month = month,
                Year = year,

                Paid = x.AssistantPayments
                    .Where(p =>
                        p.IsPaid &&
                        p.Month == month &&
                        p.Year == year)
                    .Sum(p => (decimal?)p.NetSalary) ?? 0,

                PaymentsCount = x.AssistantPayments.Count(p =>
                    p.IsPaid &&
                    p.Month == month &&
                    p.Year == year),

                LastPaymentDate = x.AssistantPayments
                    .Where(p =>
                        p.IsPaid &&
                        p.Month == month &&
                        p.Year == year)
                    .OrderByDescending(p => p.PaidAt)
                    .Select(p => (DateTime?)p.PaidAt)
                    .FirstOrDefault()
            })
            .ToListAsync(cancellationToken);

        foreach (var item in items)
        {
            item.Remaining = Math.Max(0, Math.Round(item.Salary - item.Paid, 2));

            item.Status =
                item.Paid <= 0 ? AssistantSalaryStatusNames.Unpaid :
                item.Remaining <= 0 ? AssistantSalaryStatusNames.Paid :
                AssistantSalaryStatusNames.Partial;
        }

        var status = request.Status?.Trim().ToLower();

        if (!string.IsNullOrEmpty(status) &&
            status != AssistantSalaryStatusNames.All)
        {
            items = items.Where(x => x.Status == status).ToList();
        }

        return Success(items);
    }
}

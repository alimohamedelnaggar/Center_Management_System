using CenterManagement.Core.Features.UsersFeature.Assistant.Queries.Models;

using CenterManagement.Data.Entities.Identity;
using CenterManagement.Data.Entities.Users;
using CenterManagement.Infrustructure.InfrastructureBases.Bases;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace CenterManagement.Core.Features.UsersFeature.Assistant.Queries.Handlers;

public class GetAssistantSalaryInfoQueryHandler
    : ResponseHandler,
      IRequestHandler<
          GetAssistantSalaryInfoQuery,
          Response<AssistantSalaryInfoDto>>
{
    private readonly UserManager<User> _userManager;
    private readonly ITenantContext _tenantContext;

    public GetAssistantSalaryInfoQueryHandler(
        UserManager<User> userManager,
        ITenantContext tenantContext,
        IStringLocalizer<SharedResources> localizer)
        : base(localizer)
    {
        _userManager = userManager;
        _tenantContext = tenantContext;
    }

    public async Task<Response<AssistantSalaryInfoDto>> Handle(
        GetAssistantSalaryInfoQuery request,
        CancellationToken cancellationToken)
    {
        // كل عمليات صرف مرتبات المساعد (كل الأشهر)
        var query = _userManager.Users
            .OfType<Assistent>()
            .AsNoTracking()
            .Where(x => x.Id == request.AssistantId);

        if (!_tenantContext.IsUnrestricted && _tenantContext.CenterId is Guid centerId)
            query = query.Where(x => x.CenterId == centerId);

        var result = await query
            .Select(x => new
            {
                x.Id,
                x.FullName,
                x.PhoneNumber,
                x.Salary,

                Payments = x.AssistantPayments
                    .Select(p => new AssistantPaymentDto
                    {
                        Id = p.Id,
                        Month = p.Month,
                        Year = p.Year,

                        BasicSalary = p.BasicSalary,
                        Bonus = p.Bonus ?? 0,
                        Deduction = p.Deduction ?? 0,
                        NetSalary = p.NetSalary,

                        IsPaid = p.IsPaid,
                        PaidAt = p.PaidAt,
                        CreatedBy = p.CreatedBy,
                        Notes = p.Notes
                    })
                    .ToList()
            })
            .FirstOrDefaultAsync(cancellationToken);

        if (result is null)
            return NotFound<AssistantSalaryInfoDto>(
                "المساعد غير موجود.");

        var assistant = new AssistantSalaryInfoDto
        {
            AssistantId = result.Id,
            FullName = result.FullName,
            PhoneNumber = result.PhoneNumber,
            Salary = result.Salary
        };

        assistant.TotalPaid = result.Payments
            .Where(x => x.IsPaid)
            .Sum(x => x.NetSalary);

        // تجميع عمليات الصرف حسب الشهر
        var monthGroups = result.Payments
            .GroupBy(x => new { x.Year, x.Month })
            .OrderBy(g => g.Key.Year)
            .ThenBy(g => g.Key.Month);

        foreach (var group in monthGroups)
        {
            var operations = group
                .OrderBy(x => x.PaidAt)
                .ThenBy(x => x.Id)
                .ToList();

            var totalPaid = operations
                .Where(x => x.IsPaid)
                .Sum(x => x.NetSalary);

            // المرتب الأساسي للشهر = لقطة آخر عملية صرف في الشهر
            var basicSalary = operations.Last().BasicSalary;

            var remaining = Math.Max(0, Math.Round(basicSalary - totalPaid, 2));

            assistant.Months.Add(new AssistantSalaryMonthDto
            {
                Month = group.Key.Month,
                Year = group.Key.Year,

                BasicSalary = basicSalary,
                TotalPaid = totalPaid,
                Remaining = remaining,

                Status =
                    totalPaid <= 0 ? AssistantSalaryStatusNames.Unpaid :
                    remaining <= 0 ? AssistantSalaryStatusNames.Paid :
                    AssistantSalaryStatusNames.Partial,

                PaymentsCount = operations.Count,
                Operations = operations
            });
        }

        // اسم المستلم لكل عملية صرف (من قام بتسجيل الصرف)
        var operationsAll = assistant.Months
            .SelectMany(m => m.Operations)
            .ToList();

        var recordedByIds = operationsAll
            .Where(o => o.CreatedBy.HasValue)
            .Select(o => o.CreatedBy!.Value)
            .Distinct()
            .ToList();

        if (recordedByIds.Count > 0)
        {
            var names = await _userManager.Users
                .Where(u => recordedByIds.Contains(u.Id))
                .Select(u => new { u.Id, u.FullName })
                .ToDictionaryAsync(u => u.Id, u => u.FullName, cancellationToken);

            foreach (var operation in operationsAll)
            {
                if (operation.CreatedBy.HasValue &&
                    names.TryGetValue(operation.CreatedBy.Value, out var name))
                {
                    operation.ReceivedByName = name;
                }
            }
        }

        return Success(assistant);
    }
}

using CenterManagement.Infrustructure.Data.Models;
using CenterManagement.Infrustructure.InfrastructureBases.Abstracts;
using System;
using System.Collections.Generic;
using System.Text;

namespace CenterManagement.Infrustructure.Repositories
{
    public class AssistantPaymentRepository: GenericRepository<AssistantPayment>, IAssistantPaymentRepository
    {
        private readonly AppDbContext context;

        public AssistantPaymentRepository(AppDbContext context):base(context)
        {
            this.context = context;
        }

        public async Task<bool> IsSalaryPaidAsync(Guid assistantId, int month, int year)
        {
            return await context.AssistantPayments
                .AnyAsync(x =>
                    x.AssistantId == assistantId &&
                    x.Month == month &&
                    x.Year == year);
        }

        public async Task<decimal> GetPaidAmountForMonthAsync(
            Guid assistantId,
            int month,
            int year,
            CancellationToken cancellationToken = default)
        {
            return await context.AssistantPayments
                .Where(x =>
                    x.AssistantId == assistantId &&
                    x.Month == month &&
                    x.Year == year &&
                    x.IsPaid)
                .SumAsync(x => (decimal?)x.NetSalary, cancellationToken) ?? 0;
        }

        public async Task<decimal> GetPaidAmountForMonthExceptAsync(
            Guid assistantId,
            int month,
            int year,
            Guid excludePaymentId,
            CancellationToken cancellationToken = default)
        {
            return await context.AssistantPayments
                .Where(x =>
                    x.AssistantId == assistantId &&
                    x.Month == month &&
                    x.Year == year &&
                    x.IsPaid &&
                    x.Id != excludePaymentId)
                .SumAsync(x => (decimal?)x.NetSalary, cancellationToken) ?? 0;
        }

        public async Task<AssistantPayment?> GetPaymentByIdAsync(
            Guid paymentId,
            CancellationToken cancellationToken = default)
        {
            return await context.AssistantPayments
                .FirstOrDefaultAsync(x => x.Id == paymentId, cancellationToken);
        }

        public async Task<AssistantStatisticsModel> GetAssistantStatisticsAsync(
     CancellationToken cancellationToken = default)
        {
            return new AssistantStatisticsModel
            {
                TotalAssistants = await context.Users
                    .OfType<Assistent>()
                    .CountAsync(cancellationToken),

                TotalBasicSalaries = await context.AssistantPayments
                    .SumAsync(x => (decimal?)x.BasicSalary, cancellationToken) ?? 0,

                TotalBonuses = await context.AssistantPayments
                    .SumAsync(x => (decimal?)x.Bonus, cancellationToken) ?? 0,

                TotalDeductions = await context.AssistantPayments
                    .SumAsync(x => (decimal?)x.Deduction, cancellationToken) ?? 0,

                TotalNetSalaries = await context.AssistantPayments
                    .SumAsync(x => (decimal?)x.NetSalary, cancellationToken) ?? 0
            };
        }
    }
}

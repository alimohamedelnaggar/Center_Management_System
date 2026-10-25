using CenterManagement.Infrustructure.Data.Models;
using CenterManagement.Infrustructure.InfrastructureBases.Bases;
using System;
using System.Collections.Generic;
using System.Text;

namespace CenterManagement.Infrustructure.InfrastructureBases.Abstracts
{
    public interface IAssistantPaymentRepository:IGenericRepository<AssistantPayment>
    {
        Task<bool> IsSalaryPaidAsync(Guid assistantId, int month, int year);

        Task<decimal> GetPaidAmountForMonthAsync(Guid assistantId, int month, int year, CancellationToken cancellationToken = default);

        // إجمالي ما تم صرفه خلال الشهر مع استثناء عملية صرف واحدة
        // (تُستخدم عند تعديل مبلغ عملية صرف قائمة)
        Task<decimal> GetPaidAmountForMonthExceptAsync(Guid assistantId, int month, int year, Guid excludePaymentId, CancellationToken cancellationToken = default);

        Task<AssistantPayment?> GetPaymentByIdAsync(Guid paymentId, CancellationToken cancellationToken = default);

        Task<AssistantStatisticsModel> GetAssistantStatisticsAsync(CancellationToken cancellationToken = default);
    }
}

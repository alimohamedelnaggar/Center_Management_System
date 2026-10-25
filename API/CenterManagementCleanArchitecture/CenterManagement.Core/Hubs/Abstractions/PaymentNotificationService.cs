using Microsoft.AspNetCore.SignalR;

namespace CenterManagement.Core.Hubs.Abstractions;

public interface IPaymentNotificationService
{
    Task PaymentAdded(FinancialReportDto payment);
    Task PaymentUpdated(FinancialReportDto payment);
    Task PaymentDeleted(Guid paymentId);
}
public sealed class PaymentNotificationService : IPaymentNotificationService
{
    private readonly IHubContext<PaymentHub> _hubContext;

    public PaymentNotificationService(IHubContext<PaymentHub> hubContext)
    {
        _hubContext = hubContext;
    }

    public async Task PaymentAdded(FinancialReportDto payment)
    {
        await _hubContext.Clients.All.SendAsync("PaymentAdded", payment);
    }

    public async Task PaymentUpdated(FinancialReportDto payment)
    {
        await _hubContext.Clients.All.SendAsync("PaymentUpdated", payment);
    }

    public async Task PaymentDeleted(Guid paymentId)
    {
        await _hubContext.Clients.All.SendAsync("PaymentDeleted", paymentId);
    }
}

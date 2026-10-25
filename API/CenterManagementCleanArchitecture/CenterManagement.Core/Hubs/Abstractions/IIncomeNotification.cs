using CenterManagement.Core.Features.IncomeFeature.Queries.Results;
using Microsoft.AspNetCore.SignalR;

namespace CenterManagement.Core.Hubs.Abstractions;

public interface IIncomeNotification
{
    Task IncomeAddedAsync(IncomeDTO income);
    Task IncomeUpdatedAsync(IncomeDTO income);
    Task IncomeDeletedAsync(Guid incomeId);
}

public class IncomeNotification : IIncomeNotification
{
    private readonly IHubContext<IncomeHub> _hubContext;

    public IncomeNotification(IHubContext<IncomeHub> hubContext)
    {
        _hubContext = hubContext;
    }

    public async Task IncomeAddedAsync(IncomeDTO income)
    {
        await _hubContext.Clients.All.SendAsync("IncomeAdded", income);
    }

    public async Task IncomeUpdatedAsync(IncomeDTO income)
    {
        await _hubContext.Clients.All.SendAsync("IncomeUpdated", income);
    }

    public async Task IncomeDeletedAsync(Guid incomeId)
    {
        await _hubContext.Clients.All.SendAsync("IncomeDeleted", incomeId);
    }
}
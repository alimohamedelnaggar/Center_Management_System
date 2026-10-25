namespace CenterManagement.Core.Hubs.Abstractions;

using CenterManagement.Core.Features.ExpenseCategoryFeature.Queries.Results;
using Microsoft.AspNetCore.SignalR;

public interface IExpenseCategoryNotification
{
    Task ExpenseCategoryAddedAsync(ExpenseCategoryDTO category);
    Task ExpenseCategoryUpdatedAsync(ExpenseCategoryDTO category);
    Task ExpenseCategoryDeletedAsync(Guid id);
}
 
public class ExpenseCategoryNotification : IExpenseCategoryNotification
{
    private readonly IHubContext<ExpenseCategoryHub> _hubContext;

    public ExpenseCategoryNotification(IHubContext<ExpenseCategoryHub> hubContext)
    {
        _hubContext = hubContext;
    }

    public async Task ExpenseCategoryAddedAsync(ExpenseCategoryDTO category)
    {
        await _hubContext.Clients.All.SendAsync("ExpenseCategoryAdded", category);
    }

    public async Task ExpenseCategoryUpdatedAsync(ExpenseCategoryDTO category)
    {
        await _hubContext.Clients.All.SendAsync("ExpenseCategoryUpdated", category);
    }

    public async Task ExpenseCategoryDeletedAsync(Guid id)
    {
        await _hubContext.Clients.All.SendAsync("ExpenseCategoryDeleted", id);
    }
}
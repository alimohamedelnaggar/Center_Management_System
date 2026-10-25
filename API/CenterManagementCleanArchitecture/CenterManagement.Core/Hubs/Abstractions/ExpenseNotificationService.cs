using CenterManagement.Core.Features.ExpenseFeature.Students.Queries.Results;
using Microsoft.AspNetCore.SignalR;

namespace CenterManagement.Core.Hubs.Abstractions;

public interface IExpenseNotification
{
    Task ExpenseAddedAsync(ExpenseDTO expense);
    Task ExpenseUpdatedAsync(ExpenseDTO expense);
    Task ExpenseDeletedAsync(Guid expenseId);
}
public class ExpenseNotification : IExpenseNotification
{
    private readonly IHubContext<ExpenseHub> _hubContext;

    public ExpenseNotification(IHubContext<ExpenseHub> hubContext)
    {
        _hubContext = hubContext;
    }

    public async Task ExpenseAddedAsync(ExpenseDTO expense)
    {
        await _hubContext.Clients.All.SendAsync("ExpenseAdded", expense);
    }

    public async Task ExpenseUpdatedAsync(ExpenseDTO expense)
    {
        await _hubContext.Clients.All.SendAsync("ExpenseUpdated", expense);
    }

    public async Task ExpenseDeletedAsync(Guid expenseId)
    {
        await _hubContext.Clients.All.SendAsync("ExpenseDeleted", expenseId);
    }
}
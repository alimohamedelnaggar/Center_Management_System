using CenterManagement.Application.Features.Incomes.DTOs;
using CenterManagement.Core.Features.IncomeCategoryFeature.Queries.Results;
using Microsoft.AspNetCore.SignalR;

namespace CenterManagement.Core.Hubs.Abstractions;

public interface IIncomeCategoryNotification
{
    Task IncomeCategoryAddedAsync(IncomeCategoryDTO category);
    Task IncomeCategoryUpdatedAsync(IncomeCategoryDTO category);
    Task IncomeCategoryDeletedAsync(Guid categoryId);
}

public class IncomeCategoryNotification : IIncomeCategoryNotification
{
    private readonly IHubContext<IncomeCategoryHub> _hubContext;

    public IncomeCategoryNotification(IHubContext<IncomeCategoryHub> hubContext)
    {
        _hubContext = hubContext;
    }

    public async Task IncomeCategoryAddedAsync(IncomeCategoryDTO category)
    {
        await _hubContext.Clients.All.SendAsync("IncomeCategoryAdded", category);
    }

    public async Task IncomeCategoryUpdatedAsync(IncomeCategoryDTO category)
    {
        await _hubContext.Clients.All.SendAsync("IncomeCategoryUpdated", category);
    }

    public async Task IncomeCategoryDeletedAsync(Guid categoryId)
    {
        await _hubContext.Clients.All.SendAsync("IncomeCategoryDeleted", categoryId);
    }
}
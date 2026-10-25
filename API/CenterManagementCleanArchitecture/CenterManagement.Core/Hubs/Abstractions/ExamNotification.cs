using CenterManagement.Data.Entities.Exams;
using Microsoft.AspNetCore.SignalR;

namespace CenterManagement.Core.Hubs.Abstractions;

public interface IExamNotification
{
    Task ExamAdded(Exam exam);
    Task ExamDeleted(Guid id);
}
public class ExamNotification : IExamNotification
{
    private readonly IHubContext<ExamHub> _hubContext;

    public ExamNotification(IHubContext<ExamHub> hubContext)
    {
        _hubContext = hubContext;
    }

    public async Task ExamAdded(Exam exam)
    {
        await _hubContext.Clients.All.SendAsync("ExamAdded", new
        {
            exam.Id,
            exam.Name,
            exam.GroupId,
            exam.SessionId,
            exam.ExamDate
        });
    }
    public async Task ExamDeleted(Guid id)
    {
        await _hubContext.Clients.All.SendAsync("ExamDeleted", id);
    }
}
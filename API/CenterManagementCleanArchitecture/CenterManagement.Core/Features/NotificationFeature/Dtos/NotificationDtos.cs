namespace CenterManagement.Core.Features.NotificationFeature.Dtos;

public class NotificationDTO
{
    public Guid Id { get; set; }
    public string Title { get; set; } = default!;
    public string? Body { get; set; }
    public string Type { get; set; } = default!;
    public Guid? ReferenceId { get; set; }
    public string? ReferenceType { get; set; }
    public Guid? StudentId { get; set; }
    public bool IsRead { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class NotificationPagedDTO
{
    public List<NotificationDTO> Items { get; set; } = new();
    public int UnreadCount { get; set; }
}

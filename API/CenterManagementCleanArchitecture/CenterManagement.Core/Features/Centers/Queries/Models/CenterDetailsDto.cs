namespace CenterManagement.Core.Features.Centers.Queries.Models;

public class CenterDetailsDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = default!;
    public string? LogoUrl { get; set; }
    public string? Phone { get; set; }
    public string? Address { get; set; }
    public string? Description { get; set; }
    public string? ThemeColor { get; set; }
    public string Type { get; set; } = default!;
    public string Status { get; set; } = default!;
    public bool IsActive { get; set; }

    public Guid? OwnerId { get; set; }
    public string? OwnerName { get; set; }
    public string? OwnerPhone { get; set; }
    public string? OwnerEmail { get; set; }

    public int TeachersCount { get; set; }
    public int AssistantsCount { get; set; }
    public int StudentsCount { get; set; }
    public int GroupsCount { get; set; }

    public DateTime? SubscriptionStart { get; set; }
    public DateTime? SubscriptionEnd { get; set; }
    public string? Plan { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }
}

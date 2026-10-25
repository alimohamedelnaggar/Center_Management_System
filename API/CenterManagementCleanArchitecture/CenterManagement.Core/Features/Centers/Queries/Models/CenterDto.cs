namespace CenterManagement.Core.Features.Centers.Queries.Models;

public class CenterDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = default!;
    public string? LogoUrl { get; set; }
    public string? Phone { get; set; }
    public string? Address { get; set; }
    public string? ThemeColor { get; set; }
    public string? Description { get; set; }
    public bool IsActive { get; set; }
    public Guid? OwnerId { get; set; }
    public DateTime CreatedAt { get; set; }
}

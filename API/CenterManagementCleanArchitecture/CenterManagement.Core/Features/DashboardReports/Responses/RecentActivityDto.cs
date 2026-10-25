public class RecentActivityDto
{
    public string ActivityType { get; set; } = default!;

    public string Description { get; set; } = default!;

    public string? RelatedName { get; set; }

    public DateTime Date { get; set; }
}
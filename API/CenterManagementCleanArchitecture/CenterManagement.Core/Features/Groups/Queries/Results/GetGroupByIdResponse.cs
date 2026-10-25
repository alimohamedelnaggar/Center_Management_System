

namespace CenterManagement.Core.Features.Groups.Queries.Results;

public class GetGroupByIdResponse
{
    public Guid Id { get; set; }

    public string Name { get; set; } = default!;

    public decimal MonthlyPrice { get; set; }

    public int TotalStudentsCount { get; set; }
    public int SessionsPerMonth { get; set; }

    public DateTime CreatedAt { get; set; }
}

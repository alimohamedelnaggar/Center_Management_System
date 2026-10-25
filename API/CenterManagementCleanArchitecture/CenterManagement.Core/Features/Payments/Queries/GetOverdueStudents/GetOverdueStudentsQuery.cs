using CenterManagement.Core.Features.Payments.Queries.Results;

namespace CenterManagement.Core.Features.Payments.Queries.Models;

/// <summary>
/// Students who still owe money (nothing paid or only partially paid) for a
/// billing month. Defaults to the current month when no
/// <see cref="BillingPeriod"/> is supplied.
/// </summary>
public sealed class GetOverdueStudentsQuery
    : IRequest<PaginatedResult<GetOverdueStudentsResponse>>
{
    public string? Search { get; set; }

    public Guid? GroupId { get; set; }

    public Guid? TeacherId { get; set; }

    public DateOnly? BillingPeriod { get; set; }

    public int PageNumber { get; set; } = 1;

    public int PageSize { get; set; } = 10;
}

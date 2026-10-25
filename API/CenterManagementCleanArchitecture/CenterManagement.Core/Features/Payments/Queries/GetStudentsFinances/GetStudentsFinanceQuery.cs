using CenterManagement.Data.Enums;

public sealed class GetStudentsFinanceQuery
    : IRequest<PaginatedResult<GetStudentsFinanceResponse>>
{
    public string? Search { get; set; }

    public Guid? GroupId { get; set; }

    public SubscriptionType? SubscriptionType { get; set; }

    public int? PaymentStatus { get; set; }
    public DateOnly? BillingPeriod { get; set; }

    public int PageNumber { get; set; } = 1;

    public int PageSize { get; set; } = 10;
}
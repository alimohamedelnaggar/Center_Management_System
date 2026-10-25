public sealed class GetPaymentsPaginatedQuery
    : IRequest<PaginatedResult<GetPaymentsPaginatedResponse>>
{
    public int PageNumber { get; set; } = 1;

    public int PageSize { get; set; } = 10;

    public string? Search { get; set; }

    public Guid? GroupId { get; set; }

    public SubscriptionType? SubscriptionType { get; set; }
}
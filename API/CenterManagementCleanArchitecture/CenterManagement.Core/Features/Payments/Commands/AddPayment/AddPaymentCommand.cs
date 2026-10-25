namespace CenterManagement.Core.Features.Payments.Commands.Models;

public sealed record AddPaymentCommand : IRequest<Response<string>>
{
    public Guid StudentId { get; init; }

    public Guid GroupId { get; init; }

    public Guid? SessionId { get; init; }

    public DateOnly? BillingPeriod { get; init; }

    public decimal Amount { get; init; }

    public string? Notes { get; init; }
    public int? SessionsCount { get; init; }
}

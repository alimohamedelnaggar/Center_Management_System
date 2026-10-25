namespace CenterManagement.Core.Features.Payments.Commands.Models;

public sealed record UpdatePaymentCommand : IRequest<Response<string>>
{
    public Guid Id { get; init; }

    public Guid StudentId { get; init; }

    public Guid GroupId { get; init; }

    public Guid? SessionId { get; init; }

    public DateOnly? BillingPeriod { get; init; }

    public decimal Amount { get; init; }

    public string? Notes { get; init; }
}
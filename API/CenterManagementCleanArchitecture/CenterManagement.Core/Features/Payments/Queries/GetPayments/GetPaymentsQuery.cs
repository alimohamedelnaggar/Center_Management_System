using CenterManagement.Core.Features.Payments.Queries.Results;

namespace CenterManagement.Core.Features.Payments.Queries.Models;

public record GetPaymentsQuery()
    : IRequest<Response<List<PaymentDto>>>;
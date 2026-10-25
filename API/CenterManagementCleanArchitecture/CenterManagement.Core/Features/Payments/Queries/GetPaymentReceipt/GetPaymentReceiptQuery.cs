using CenterManagement.Core.Features.Payments.Queries.Results;

namespace CenterManagement.Core.Features.Payments.Queries.Models;

public sealed record GetPaymentReceiptQuery(Guid PaymentId)
    : IRequest<Response<PaymentReceiptDto>>;

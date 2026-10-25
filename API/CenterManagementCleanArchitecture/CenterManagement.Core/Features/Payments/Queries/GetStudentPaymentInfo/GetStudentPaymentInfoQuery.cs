using CenterManagement.Core.Bases;
using CenterManagement.Core.Features.Payments.Queries.Results;
using MediatR;

namespace CenterManagement.Core.Features.Payments.Queries.Models;

public sealed record GetStudentPaymentInfoQuery(
    Guid StudentId,
    DateOnly? BillingPeriod = null,
    int? SessionsCount = null)
    : IRequest<Response<StudentPaymentInfoDto>>;
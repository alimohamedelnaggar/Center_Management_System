using CenterManagement.Core.Bases;
using MediatR;

namespace CenterManagement.Core.Features.IncomeFeature.Commands.Models;

public sealed record EditIncomeCommand(
    Guid Id,
    string Name,
    Guid CategoryId,
    decimal Amount,
    DateOnly IncomeDate,
    string? Notes,
    Guid? GroupId = null
) : IRequest<Response<string>>;
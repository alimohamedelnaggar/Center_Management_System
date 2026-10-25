using CenterManagement.Core.Bases;
using MediatR;

namespace CenterManagement.Core.Features.IncomeFeature.Commands.Models;

public sealed record AddIncomeCommand(
    string Name,
    Guid CategoryId,
    decimal Amount,
    DateOnly IncomeDate,
    string? Notes,
    Guid? GroupId = null
) : IRequest<Response<string>>;
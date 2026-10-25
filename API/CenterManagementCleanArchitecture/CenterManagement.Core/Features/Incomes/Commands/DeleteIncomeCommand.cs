using CenterManagement.Core.Bases;
using MediatR;

namespace CenterManagement.Core.Features.IncomeFeature.Commands.Models;

public sealed record DeleteIncomeCommand(Guid Id)
    : IRequest<Response<string>>;
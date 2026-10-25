using CenterManagement.Core.Bases;
using MediatR;

namespace CenterManagement.Core.Features.Incomes.IncomeCategoryFeature.Commands;

public sealed record DeleteIncomeCategoryCommand(Guid Id)
    : IRequest<Response<string>>;
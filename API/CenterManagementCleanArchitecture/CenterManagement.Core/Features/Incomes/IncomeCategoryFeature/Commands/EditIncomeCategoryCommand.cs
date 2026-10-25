using CenterManagement.Core.Bases;
using MediatR;

namespace CenterManagement.Core.Features.Incomes.IncomeCategoryFeature.Commands;

public sealed record EditIncomeCategoryCommand(
    Guid Id,
    string Name
) : IRequest<Response<string>>;
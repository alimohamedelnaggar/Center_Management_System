using CenterManagement.Core.Bases;
using MediatR;

namespace CenterManagement.Core.Features.Incomes.IncomeCategoryFeature.Commands;

public sealed record AddIncomeCategoryCommand(
    string Name
) : IRequest<Response<string>>;
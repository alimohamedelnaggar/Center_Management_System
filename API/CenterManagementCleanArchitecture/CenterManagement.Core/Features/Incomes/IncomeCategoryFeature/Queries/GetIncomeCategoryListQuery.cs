using CenterManagement.Core.Bases;
using CenterManagement.Core.Features.IncomeCategoryFeature.Queries.Results;
using MediatR;

namespace CenterManagement.Core.Features.IncomeCategoryFeature.Queries.Models;

public class GetIncomeCategoryListQuery : IRequest<Response<List<IncomeCategoryDTO>>>
{
}
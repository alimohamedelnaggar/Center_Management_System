using CenterManagement.Core.Features.AcademicYearFeature.Dtos;

namespace CenterManagement.Core.Features.AcademicYearFeature.Queries.Models;

public class GetAcademicYearsQuery : IRequest<Response<List<AcademicYearDTO>>>
{
}
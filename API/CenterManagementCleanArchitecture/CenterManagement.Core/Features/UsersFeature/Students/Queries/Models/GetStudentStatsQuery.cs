using CenterManagement.Core.Features.UsersFeature.Students.Queries.Results;

namespace CenterManagement.Core.Features.UsersFeature.Students.Queries.Models;

public record GetStudentStatsQuery : IRequest<Response<StudentStatsResult>>;
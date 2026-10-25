using CenterManagement.Core.Features.DashboardReports.Responses;

namespace CenterManagement.Core.Features.DashboardReports.Queries.GetStudentMovement;

public sealed record GetStudentMovementQuery(int Year)
    : IRequest<Response<List<StudentMovementDto>>>;
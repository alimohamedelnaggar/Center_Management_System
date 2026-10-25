namespace CenterManagement.Core.Features.AttendenceFeature.Queries.Models;


public record GetAttendanceStatsQuery
    : IRequest<Response<AttendanceStatsDTO>>;
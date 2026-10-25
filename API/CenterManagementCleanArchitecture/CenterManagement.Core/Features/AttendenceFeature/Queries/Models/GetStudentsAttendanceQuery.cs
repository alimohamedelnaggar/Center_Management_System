using CenterManagement.Core.Features.AttendenceFeature.Queries.Result;

namespace CenterManagement.Core.Features.AttendenceFeature.Queries.Models;

public record GetStudentsAttendanceQuery(
    Guid GroupId,
    Guid SessionId
) : IRequest<Response<List<StudentAttendenceDTO>>>;
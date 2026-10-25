public record GetStudentGradesReportQuery(Guid StudentId, Guid? GroupId = null)
    : IRequest<Response<StudentGradesReportDto>>;
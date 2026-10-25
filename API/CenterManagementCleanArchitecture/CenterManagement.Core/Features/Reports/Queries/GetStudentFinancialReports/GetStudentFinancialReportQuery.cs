public record GetStudentFinancialReportQuery(Guid StudentId)
    : IRequest<Response<StudentFinancialReportDto>>;
using CenterManagement.Core.Features.ParentPortalFeature.Dtos;

namespace CenterManagement.Core.Features.ParentPortalFeature.Queries.Models;

/// <summary>
/// Every child query carries the target student id. The handler first proves the
/// student is linked to the signed-in parent (otherwise 404) and only then
/// enforces the section module (otherwise 403).
/// </summary>
public class GetChildSummaryQuery : IRequest<Response<ParentChildSummaryDTO>>
{
    public Guid StudentId { get; set; }

    public GetChildSummaryQuery(Guid studentId) => StudentId = studentId;
}

public class GetChildAttendanceQuery : IRequest<Response<ParentChildAttendanceDTO>>
{
    public Guid StudentId { get; set; }

    public GetChildAttendanceQuery(Guid studentId) => StudentId = studentId;
}

public class GetChildGradesQuery : IRequest<Response<ParentChildGradesDTO>>
{
    public Guid StudentId { get; set; }

    public GetChildGradesQuery(Guid studentId) => StudentId = studentId;
}

public class GetChildExamResultsQuery : IRequest<Response<ParentChildExamResultsDTO>>
{
    public Guid StudentId { get; set; }

    public GetChildExamResultsQuery(Guid studentId) => StudentId = studentId;
}

public class GetChildPaymentsQuery : IRequest<Response<ParentChildPaymentsDTO>>
{
    public Guid StudentId { get; set; }

    public GetChildPaymentsQuery(Guid studentId) => StudentId = studentId;
}

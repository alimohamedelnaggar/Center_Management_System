using CenterManagement.Core.Features.QuestionExamFeature.Dtos;

namespace CenterManagement.Core.Features.QuestionExamFeature.Queries.Models;

public class GetQuestionExamsPaginatedQuery : IRequest<Response<PaginatedResult<QuestionExamDTO>>>
{
    public int PageNumber { get; set; } = 1;
    public int PageSize { get; set; } = 10;
    public string? Search { get; set; }
    public Guid? GroupId { get; set; }
    public Guid? AcademicYearId { get; set; }
    public QuestionExamMode? Mode { get; set; }
    public bool? IsPublished { get; set; }
    public DateTime? From { get; set; }
    public DateTime? To { get; set; }
}

public class GetQuestionExamByIdQuery : IRequest<Response<QuestionExamDetailDTO>>
{
    public Guid Id { get; set; }
}

public class GetQuestionExamResultsQuery
    : IRequest<Response<List<QuestionExamStudentResultDTO>>>
{
    public Guid ExamId { get; set; }

    public GetQuestionExamResultsQuery(Guid examId)
    {
        ExamId = examId;
    }
}

public class GetQuestionExamAttemptDetailQuery
    : IRequest<Response<QuestionExamAttemptDetailDTO>>
{
    public Guid AttemptId { get; set; }

    public GetQuestionExamAttemptDetailQuery(Guid attemptId)
    {
        AttemptId = attemptId;
    }
}

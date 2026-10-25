using CenterManagement.Core.Features.QuestionExamFeature.Dtos;

namespace CenterManagement.Core.Features.QuestionExamFeature.Commands.Models;

public class CreateQuestionExamCommand : IRequest<Response<Guid>>
{
    public string Name { get; set; } = default!;
    public Guid GroupId { get; set; }
    public Guid AcademicYearId { get; set; }
    public QuestionExamMode Mode { get; set; }
    public DateTime ExamDate { get; set; }
    public int DurationMinutes { get; set; }
    public bool ShuffleQuestions { get; set; }
    public bool ShuffleOptions { get; set; }
    public List<Guid> QuestionIds { get; set; } = new();
}

public class EditQuestionExamCommand : IRequest<Response<Guid>>
{
    public Guid Id { get; set; }
    public string Name { get; set; } = default!;
    public Guid GroupId { get; set; }
    public Guid AcademicYearId { get; set; }
    public QuestionExamMode Mode { get; set; }
    public DateTime ExamDate { get; set; }
    public int DurationMinutes { get; set; }
    public bool ShuffleQuestions { get; set; }
    public bool ShuffleOptions { get; set; }
    public List<Guid> QuestionIds { get; set; } = new();
}

public class DeleteQuestionExamCommand : IRequest<Response<string>>
{
    public Guid Id { get; set; }

    public DeleteQuestionExamCommand(Guid id)
    {
        Id = id;
    }
}

public class PublishQuestionExamResultsCommand : IRequest<Response<string>>
{
    public Guid ExamId { get; set; }
    public bool Publish { get; set; }

    public PublishQuestionExamResultsCommand(Guid examId, bool publish)
    {
        ExamId = examId;
        Publish = publish;
    }
}

public class GradeQuestionExamAttemptCommand : IRequest<Response<string>>
{
    public Guid AttemptId { get; set; }
    public List<GradeQuestionExamAnswerDTO> Grades { get; set; } = new();

    public GradeQuestionExamAttemptCommand(
        Guid attemptId,
        List<GradeQuestionExamAnswerDTO> grades)
    {
        AttemptId = attemptId;
        Grades = grades ?? new List<GradeQuestionExamAnswerDTO>();
    }
}

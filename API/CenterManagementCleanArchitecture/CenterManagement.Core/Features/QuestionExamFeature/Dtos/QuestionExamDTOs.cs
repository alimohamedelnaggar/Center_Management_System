namespace CenterManagement.Core.Features.QuestionExamFeature.Dtos;

public class QuestionExamDTO
{
    public Guid Id { get; set; }
    public string Name { get; set; } = default!;
    public Guid GroupId { get; set; }
    public string GroupName { get; set; } = default!;
    public Guid AcademicYearId { get; set; }
    public string AcademicYearName { get; set; } = default!;
    public int Mode { get; set; }
    public string ModeName { get; set; } = default!;
    public DateTime ExamDate { get; set; }
    public int DurationMinutes { get; set; }
    public int QuestionsCount { get; set; }
    public decimal TotalMarks { get; set; }
    public bool IsResultsPublished { get; set; }
    public bool ShuffleQuestions { get; set; }
    public bool ShuffleOptions { get; set; }
}

public class QuestionExamQuestionOptionDTO
{
    public Guid Id { get; set; }
    public int Order { get; set; }
    public string Text { get; set; } = default!;
    public bool IsCorrect { get; set; }
}

public class QuestionExamQuestionDTO
{
    public Guid Id { get; set; }
    public int Type { get; set; }
    public string TypeName { get; set; } = default!;
    public string? Text { get; set; }
    public string? ImageName { get; set; }
    public decimal Mark { get; set; }
    public int Order { get; set; }
    public List<QuestionExamQuestionOptionDTO> Options { get; set; } = new();
}

public class QuestionExamStudentResultDTO
{
    public Guid StudentId { get; set; }
    public string StudentName { get; set; } = default!;

    public Guid? AttemptId { get; set; }

    // notstarted | inprogress | finished
    public string Status { get; set; } = default!;

    public decimal? Score { get; set; }
    public decimal TotalMark { get; set; }
    public DateTime? StartedAt { get; set; }
    public DateTime? SubmittedAt { get; set; }
    public bool HasPendingManualGrading { get; set; }

    // Anti-cheat: total violations detected during the attempt.
    public int ViolationCount { get; set; }
    public List<QuestionExamViolationDTO> Violations { get; set; } = new();
}

public class QuestionExamViolationDTO
{
    public string Type { get; set; } = default!;
    public string Label { get; set; } = default!;
    public int Count { get; set; }
    public DateTime? LastAt { get; set; }
}

public class QuestionExamAttemptDetailDTO
{
    public Guid AttemptId { get; set; }
    public Guid ExamId { get; set; }
    public string ExamName { get; set; } = default!;
    public Guid StudentId { get; set; }
    public string StudentName { get; set; } = default!;
    public decimal Score { get; set; }
    public decimal TotalMark { get; set; }
    public bool HasPendingManualGrading { get; set; }
    public bool IsResultsPublished { get; set; }
    public DateTime? SubmittedAt { get; set; }
    public List<QuestionExamAttemptAnswerDTO> Answers { get; set; } = new();
}

public class QuestionExamAttemptAnswerDTO
{
    public Guid AnswerId { get; set; }
    public Guid QuestionId { get; set; }
    public int Order { get; set; }
    public int Type { get; set; }
    public string TypeName { get; set; } = default!;
    public string? Text { get; set; }
    public string? ImageName { get; set; }
    public decimal Mark { get; set; }
    public decimal AwardedMark { get; set; }
    public bool? IsCorrect { get; set; }
    public Guid? SelectedOptionId { get; set; }
    public Guid? CorrectOptionId { get; set; }
    public string? EssayAnswer { get; set; }
    public List<QuestionExamQuestionOptionDTO> Options { get; set; } = new();
}

public class GradeQuestionExamAnswerDTO
{
    public Guid AnswerId { get; set; }
    public decimal AwardedMark { get; set; }
}

public class QuestionExamDetailDTO
{
    public Guid Id { get; set; }
    public string Name { get; set; } = default!;
    public Guid GroupId { get; set; }
    public string GroupName { get; set; } = default!;
    public Guid AcademicYearId { get; set; }
    public string AcademicYearName { get; set; } = default!;
    public int Mode { get; set; }
    public string ModeName { get; set; } = default!;
    public DateTime ExamDate { get; set; }
    public int DurationMinutes { get; set; }
    public int QuestionsCount { get; set; }
    public decimal TotalMarks { get; set; }
    public bool IsResultsPublished { get; set; }
    public bool ShuffleQuestions { get; set; }
    public bool ShuffleOptions { get; set; }
    public List<QuestionExamQuestionDTO> Questions { get; set; } = new();
}

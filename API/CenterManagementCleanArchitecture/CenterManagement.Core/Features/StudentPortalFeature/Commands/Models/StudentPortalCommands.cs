using CenterManagement.Core.Features.StudentPortalFeature.Dtos;

namespace CenterManagement.Core.Features.StudentPortalFeature.Commands.Models;

public class StartStudentExamCommand : IRequest<Response<StudentAttemptDTO>>
{
    public Guid ExamId { get; set; }

    public StartStudentExamCommand(Guid examId)
    {
        ExamId = examId;
    }
}

public class SubmitStudentExamCommand : IRequest<Response<StudentResultDTO>>
{
    public Guid AttemptId { get; set; }
    public List<StudentSubmitAnswerDTO> Answers { get; set; } = new();

    public SubmitStudentExamCommand(Guid attemptId, List<StudentSubmitAnswerDTO> answers)
    {
        AttemptId = attemptId;
        Answers = answers;
    }
}

public class ReportExamViolationCommand : IRequest<Response<string>>
{
    public Guid AttemptId { get; set; }
    public string Type { get; set; } = default!;

    public ReportExamViolationCommand(Guid attemptId, string type)
    {
        AttemptId = attemptId;
        Type = type;
    }
}

public class MarkNotificationReadCommand : IRequest<Response<string>>
{
    public Guid Id { get; set; }

    public MarkNotificationReadCommand(Guid id)
    {
        Id = id;
    }
}

public class MarkAllNotificationsReadCommand : IRequest<Response<string>>
{
}

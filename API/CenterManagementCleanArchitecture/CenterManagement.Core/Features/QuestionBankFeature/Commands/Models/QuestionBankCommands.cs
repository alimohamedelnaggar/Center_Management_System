namespace CenterManagement.Core.Features.QuestionBankFeature.Commands.Models;

public class AddQuestionBankCommand : IRequest<Response<string>>
{
    public string Name { get; set; } = default!;
    public Guid AcademicYearId { get; set; }
}

public class EditQuestionBankCommand : IRequest<Response<string>>
{
    public Guid Id { get; set; }
    public string Name { get; set; } = default!;
    public Guid AcademicYearId { get; set; }
}

public class DeleteQuestionBankCommand : IRequest<Response<string>>
{
    public Guid Id { get; set; }

    public DeleteQuestionBankCommand(Guid id)
    {
        Id = id;
    }
}

public class QuestionOptionInput
{
    public string Text { get; set; } = default!;
    public bool IsCorrect { get; set; }
}

public class AddQuestionCommand : IRequest<Response<string>>
{
    public Guid QuestionBankId { get; set; }
    public QuestionType Type { get; set; }
    public string? Text { get; set; }
    public string? ImageName { get; set; }
    public decimal Mark { get; set; } = 1;
    public List<QuestionOptionInput> Options { get; set; } = new();
}

public class EditQuestionCommand : IRequest<Response<string>>
{
    public Guid Id { get; set; }
    public QuestionType Type { get; set; }
    public string? Text { get; set; }
    public string? ImageName { get; set; }
    public decimal Mark { get; set; } = 1;
    public List<QuestionOptionInput> Options { get; set; } = new();
}

public class DeleteQuestionCommand : IRequest<Response<string>>
{
    public Guid Id { get; set; }

    public DeleteQuestionCommand(Guid id)
    {
        Id = id;
    }
}
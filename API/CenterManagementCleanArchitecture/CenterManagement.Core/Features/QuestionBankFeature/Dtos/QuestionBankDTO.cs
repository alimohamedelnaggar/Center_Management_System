namespace CenterManagement.Core.Features.QuestionBankFeature.Dtos;

public class QuestionBankDTO
{
    public Guid Id { get; set; }
    public string Name { get; set; } = default!;
    public Guid AcademicYearId { get; set; }
    public string AcademicYearName { get; set; } = default!;
    public int QuestionsCount { get; set; }
}

public class QuestionOptionDTO
{
    public Guid Id { get; set; }
    public int Order { get; set; }
    public string Text { get; set; } = default!;
    public bool IsCorrect { get; set; }
}

public class QuestionDTO
{
    public Guid Id { get; set; }
    public Guid QuestionBankId { get; set; }
    public int Type { get; set; }
    public string TypeName { get; set; } = default!;
    public string? Text { get; set; }
    public string? ImageName { get; set; }
    public decimal Mark { get; set; }
    public List<QuestionOptionDTO> Options { get; set; } = new();
}
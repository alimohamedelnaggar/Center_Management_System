using CenterManagement.Data.Entities.Groups;

namespace CenterManagement.Data.Entities.QuestionBank;

public class QuestionExam : BaseEntity, ITenantEntity
{
    public string Name { get; set; } = default!;

    public Guid GroupId { get; set; }
    public Group Group { get; set; } = default!;

    public Guid AcademicYearId { get; set; }
    public AcademicYear AcademicYear { get; set; } = default!;

    public QuestionExamMode Mode { get; set; }

    public DateTime ExamDate { get; set; } = DateTime.Now;

    public int DurationMinutes { get; set; }

    public bool IsResultsPublished { get; set; }

    public DateTime? PublishedAt { get; set; }

    public bool ShuffleQuestions { get; set; }

    public bool ShuffleOptions { get; set; }

    public ICollection<QuestionExamQuestion> Questions { get; set; } = new List<QuestionExamQuestion>();

    public Guid? CenterId { get; set; }
}

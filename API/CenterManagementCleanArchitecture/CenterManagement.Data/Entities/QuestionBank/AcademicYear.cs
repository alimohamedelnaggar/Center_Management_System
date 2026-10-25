namespace CenterManagement.Data.Entities.QuestionBank;

public class AcademicYear : BaseEntity
{
    public string Name { get; set; } = default!;

    public int Order { get; set; }

    public ICollection<QuestionBank> QuestionBanks { get; set; } = new List<QuestionBank>();
}
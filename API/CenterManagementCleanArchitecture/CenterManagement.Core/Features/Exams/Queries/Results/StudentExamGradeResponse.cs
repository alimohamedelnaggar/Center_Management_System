namespace CenterManagement.Core.Features.Exams.Queries.Results;

public record StudentExamGradeResponse
{
    public Guid? StudentId { get; set; }
    public string StudentName { get; set; }
    public string StudentPhone { get; set; }
    public string? ParentPhoneNumber { get; set; }
    public List<ExamTypeDTO> ExamTypes { get; set; } = new List<ExamTypeDTO>();
    public List<ExamGradeDTO> ExamGrades { get; set; } = new List<ExamGradeDTO>();
    public bool IsLowGrade { get; set; }

    public bool IsParentContacted { get; set; }

    public bool IsAbsent { get; set; }

}
public record ExamGradeDTO
{
    public ExamType Type { get; set; }
    public decimal Mark { get; set; }
}
public record ExamTypeDTO
{
    public ExamType Type { get; set; }
    public decimal TotalMark { get; set; }
}

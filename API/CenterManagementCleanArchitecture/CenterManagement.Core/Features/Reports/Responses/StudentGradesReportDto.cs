public sealed class StudentGradesReportDto
{
    public Guid StudentId { get; set; }

    public string StudentName { get; set; } = string.Empty;

    public string GroupName { get; set; } = string.Empty;

    public decimal TotalObtainedMarks { get; set; }

    public decimal TotalMarks { get; set; }

    public decimal Percentage { get; set; }

    public List<ExamRecordDto> Exams { get; set; } = [];

    public bool IsParentContacted { get; set; }
    public DateTime? ParentContactedAt { get; set; }
}
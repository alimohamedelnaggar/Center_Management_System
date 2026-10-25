using CenterManagement.Core.Features.Exams.Commands.Models;

public sealed class ExamRecordDto
{
    public Guid ExamId { get; set; }

    public string ExamName { get; set; } = string.Empty;

    public DateTime ExamDate { get; set; }

    public decimal ObtainedMarks { get; set; }

    public decimal TotalMarks { get; set; }

    public decimal Percentage { get; set; }

    public List<ExamComponentReportDto> Components { get; set; } = [];

    public bool IsParentContacted { get; set; }
    public DateTime? ParentContactedAt { get; set; }
    public bool IsLowGrade { get; set; }


}
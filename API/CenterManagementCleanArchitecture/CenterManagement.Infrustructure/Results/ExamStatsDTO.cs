namespace CenterManagement.Infrustructure.Results;


public class ExamStatsDTO
{
    public int TotalStudents { get; set; }

    public int GradedStudents { get; set; }

    public int RemainingStudents { get; set; }

    public double AverageMark { get; set; }
}
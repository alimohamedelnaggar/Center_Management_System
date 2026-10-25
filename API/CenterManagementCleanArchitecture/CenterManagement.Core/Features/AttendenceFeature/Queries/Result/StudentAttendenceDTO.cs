namespace CenterManagement.Core.Features.AttendenceFeature.Queries.Result;

public class StudentAttendenceDTO
{
    public Guid Id { get; set; }
    public Guid GroupId { get; set; }
    public string FullName { get; set; }
    public string Phone { get; set; }
    public string? ParentPhoneNumber { get; set; }
    public AttendanceStatus? Status { get; set; }

}
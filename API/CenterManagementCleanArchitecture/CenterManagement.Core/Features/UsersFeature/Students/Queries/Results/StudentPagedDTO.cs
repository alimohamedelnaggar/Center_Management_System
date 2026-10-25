namespace CenterManagement.Core.Features.UsersFeature.Students.Queries.Results;

public class StudentPagedDTO
{
    public Guid Id { get; set; }

    public string FullName { get; set; }
    public string Phone { get; set; }
    public string PhoneParent { get; set; }
    public string? GroupName { get; set; }
    public Guid? GroupId { get; set; }
    public bool? IsActive { get; set; }
    public DateTime? CreatedAt { get; set; }
    public bool? IsPaid { get; set; }
    public SubscriptionType? SubscriptionType { get; set; }
    public decimal? CustomMonthlyPrice { get; set; }
    public string? QrCode { get; set; }
    public string? School { get; set; }
}

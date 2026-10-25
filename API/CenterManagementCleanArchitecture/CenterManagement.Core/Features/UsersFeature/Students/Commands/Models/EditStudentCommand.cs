namespace CenterManagement.Core.Features.UsersFeature.Students.Commands.Models;

public record EditStudentCommand : IRequest<Response<AddStudentResult>>
{
    public Guid Id { get; set; }
    public string FullName { get; set; }
    public string Phone { get; set; }
    public string PhoneParent { get; set; }
    public Guid GroupId { get; set; }
    public SubscriptionType SubscriptionType { get; set; }
    public decimal? CustomMonthlyPrice { get; set; }
}

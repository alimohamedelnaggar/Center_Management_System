using CenterManagement.Data.Entities.Groups;
using CenterManagement.Data.Entities.Users;
using CenterManagement.Infrustructure.InfrastructureBases.Bases;

namespace CenterManagement.Core.Features.UsersFeature.Students.Services;

public interface IStudentCreationService
{
    Task<string> GenerateUniqueQrCodeAsync(CancellationToken cancellationToken = default);
    Task<Student> CreateStudentAsync(CreateStudentInput input, CancellationToken cancellationToken = default);

    /// <summary>
    /// Single enforcement point for a future per-center student cap. It is
    /// deliberately always allowed today; both the manual "add student" flow and
    /// the Excel import call it with the number of students they are about to add
    /// (skipped duplicates are already excluded), so adding a real limit later
    /// only needs to change this implementation.
    /// </summary>
    Task<StudentAdditionCheck> EnsureCanAddStudents(
        Guid centerId,
        int newCount,
        CancellationToken cancellationToken = default);
}

public sealed record StudentAdditionCheck(bool Allowed, string? Reason = null)
{
    public static StudentAdditionCheck Allow { get; } = new(true);

    public static StudentAdditionCheck Deny(string reason) => new(false, reason);
}

public class CreateStudentInput
{
    public string FullName { get; set; } = default!;
    public string PhoneNumber { get; set; } = default!;
    public string ParentPhoneNumber { get; set; } = default!;
    public Guid GroupId { get; set; }
    public Data.Enums.SubscriptionType SubscriptionType { get; set; }
    public decimal? CustomMonthlyPrice { get; set; }
    public Guid? CenterId { get; set; }
}

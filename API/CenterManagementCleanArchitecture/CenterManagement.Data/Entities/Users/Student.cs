using CenterManagement.Data.Entities.Groups;
using CenterManagement.Data.Entities.Identity;

namespace CenterManagement.Data.Entities.Users;

public class Student : BaseEntity, ITenantEntity
{
    public string FullName { get; set; } = default!;
    public string PhoneNumber { get; set; } = default!;
    public string ParentPhoneNumber { get; set; } = default!;
    public string? School { get; set; }
    public string? Notes { get; set; }
    public bool IsActive { get; set; } = true;
    public bool IsPaid { get; set; } = false;
    public decimal? CustomMonthlyPrice { get; set; }
    public SubscriptionType SubscriptionType { get; set; } = SubscriptionType.Session;

    // Optional link to the student's login account (Identity User with "Student" role).
    public Guid? UserId { get; set; }
    public User? User { get; set; }

    // Unique code printed on the student card / encoded in his QR.
    public string? QrCode { get; set; }

    //public Guid GroupId { get; set; }
    //public Group Group { get; set; }

    public ICollection<StudentGroup> StudentGroups { get; set; } = new HashSet<StudentGroup>();
    public ICollection<Attendance> Attendances { get; set; } = [];

    public ICollection<Payment> Payments { get; set; } = [];

    public ICollection<StudentExamComponent> StudentExams { get; set; } = [];
    public Guid? CenterId { get; set; }
    public virtual Center? Center { get; set; }
    public ICollection<StudentExamParentContact> ExamParentContacts { get; set; } = [];
}


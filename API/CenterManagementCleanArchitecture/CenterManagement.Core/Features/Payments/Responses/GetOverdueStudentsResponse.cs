using CenterManagement.Data.Enums;

namespace CenterManagement.Core.Features.Payments.Queries.Results;

/// <summary>
/// One student who still owes money for the selected billing month.
/// A student with no payment at all for the month is reported as
/// <see cref="PaymentStatus.NotPaid"/>; a student who paid a part of it is
/// reported as <see cref="PaymentStatus.PartialPaid"/>.
/// </summary>
public sealed class GetOverdueStudentsResponse
{
    public Guid StudentId { get; set; }

    public string StudentName { get; set; } = default!;

    public Guid GroupId { get; set; }

    public string GroupName { get; set; } = default!;

    public string TeacherName { get; set; } = string.Empty;

    public string ParentPhoneNumber { get; set; } = string.Empty;

    public string StudentPhoneNumber { get; set; } = string.Empty;

    public SubscriptionType SubscriptionType { get; set; }

    public DateOnly BillingPeriod { get; set; }

    public decimal TotalAmount { get; set; }

    public decimal PaidAmount { get; set; }

    public decimal RemainingAmount { get; set; }

    public DateTime? LastPaymentDate { get; set; }

    public PaymentStatus Status { get; set; }
}

/// <summary>
/// Aggregate figures for the whole (filtered) overdue set, not just the
/// current page. Returned through the paginated result's Meta object.
/// </summary>
public sealed class OverdueStudentsTotals
{
    public int TotalStudents { get; set; }

    public decimal TotalDue { get; set; }

    public decimal TotalPaid { get; set; }

    public decimal TotalRemaining { get; set; }
}

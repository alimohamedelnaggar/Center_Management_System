namespace CenterManagement.Data.Enums;

public enum PaymentStatus
{
    NotPaid = 0,

    PartialPaid = 1,

    FullyPaid = 2,
    UnPaid=3,

    // The billing month is before the student joined the group,
    // so no subscription is due for that month at all.
    // Persisted values 0..3 are unchanged, so no migration is required.
    NotApplicable = 4

}
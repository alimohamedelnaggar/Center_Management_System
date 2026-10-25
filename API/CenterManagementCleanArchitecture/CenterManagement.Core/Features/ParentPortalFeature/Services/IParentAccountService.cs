namespace CenterManagement.Core.Features.ParentPortalFeature.Services;

/// <summary>How the parent account of a single student ended up.</summary>
public enum ParentAccountOutcomeStatus
{
    /// <summary>A brand new parent login account was created (it has a password).</summary>
    Created = 0,

    /// <summary>The phone already belonged to a parent of the same center; the student was linked to it.</summary>
    Linked = 1,

    /// <summary>Nothing was done for this student (see <see cref="ParentAccountOutcome.Reason"/>).</summary>
    Skipped = 2
}

/// <summary>The result of running the parent-account routine for one student.</summary>
public sealed class ParentAccountOutcome
{
    public ParentAccountOutcomeStatus Status { get; init; }

    public Guid StudentId { get; init; }

    public string StudentName { get; init; } = default!;

    /// <summary>The parent phone registered on the student (empty when missing/invalid).</summary>
    public string ParentPhone { get; init; } = default!;

    /// <summary>Only set for a newly created account; shown to the user exactly once.</summary>
    public string? TemporaryPassword { get; init; }

    /// <summary>
    /// True when the reused account no longer uses its phone number as the
    /// password (the parent already chose a permanent one).
    /// </summary>
    public bool PasswordChanged { get; init; }

    /// <summary>Human-readable explanation, only set when <see cref="Status"/> is Skipped.</summary>
    public string? Reason { get; init; }

    public bool LinkedExistingAccount => Status == ParentAccountOutcomeStatus.Linked;

    public static ParentAccountOutcome AccountCreated(Student student, string phone, string temporaryPassword)
        => new()
        {
            Status = ParentAccountOutcomeStatus.Created,
            StudentId = student.Id,
            StudentName = student.FullName,
            ParentPhone = phone,
            TemporaryPassword = temporaryPassword
        };

    public static ParentAccountOutcome AccountLinked(Student student, string phone, bool passwordChanged = false)
        => new()
        {
            Status = ParentAccountOutcomeStatus.Linked,
            StudentId = student.Id,
            StudentName = student.FullName,
            ParentPhone = phone,
            PasswordChanged = passwordChanged
        };

    public static ParentAccountOutcome AccountSkipped(Student student, string? phone, string reason)
        => new()
        {
            Status = ParentAccountOutcomeStatus.Skipped,
            StudentId = student.Id,
            StudentName = student.FullName,
            ParentPhone = phone ?? string.Empty,
            Reason = reason
        };
}

/// <summary>
/// Creates (or reuses) the parent login account of a student and links the
/// student to it. Shared by the single-student flow and the bulk flow so both
/// apply exactly the same rules (phone ownership, cross-center refusal, role
/// assignment, idempotent linking).
/// </summary>
public interface IParentAccountService
{
    /// <summary>
    /// Ensures the student's parent has a login account in the same center and is
    /// linked to the student. Never throws: a failure is reported as a Skipped
    /// outcome carrying a human-readable reason.
    /// </summary>
    Task<ParentAccountOutcome> EnsureAccountAsync(Student student, CancellationToken cancellationToken = default);
}

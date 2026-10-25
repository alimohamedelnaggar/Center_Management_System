namespace CenterManagement.Core.Features.UsersFeature.Students.Commands.Models;

/// <summary>
/// One-time credentials handed back right after a student login account is
/// created or its password is reset. The temporary password is never persisted
/// or logged in plaintext; it only travels in this response.
/// </summary>
public class StudentAccountCredential
{
    public Guid StudentId { get; set; }
    public string StudentName { get; set; } = default!;
    public string Username { get; set; } = default!;
    public string TemporaryPassword { get; set; } = default!;
}

/// <summary>A student whose account could not be created, with a human reason.</summary>
public class SkippedStudentAccount
{
    public Guid StudentId { get; set; }
    public string StudentName { get; set; } = default!;
    public string Reason { get; set; } = default!;
}

public class AddStudentResult
{
    /// <summary>Present when a login account was created for the new student.</summary>
    public StudentAccountCredential? Account { get; set; }
}

public class GenerateStudentAccountsResult
{
    public List<StudentAccountCredential> Created { get; set; } = [];
    public List<SkippedStudentAccount> Skipped { get; set; } = [];

    /// <summary>
    /// Every student of the center, with his phone and (when a new account was
    /// just created) the one-time password. Students that already had an account
    /// are present too, with an empty password.
    /// </summary>
    public List<StudentCredentialRow> All { get; set; } = [];
}

/// <summary>One row of the "all students" credentials sheet.</summary>
public class StudentCredentialRow
{
    public Guid StudentId { get; set; }
    public string StudentName { get; set; } = default!;
    public string? GroupName { get; set; }
    public string? Phone { get; set; }
    public string? Username { get; set; }
    public bool HasAccount { get; set; }

    /// <summary>Only set for an account created during this run.</summary>
    public string? TemporaryPassword { get; set; }

    /// <summary>True when the student already replaced the phone-based password.</summary>
    public bool PasswordChanged { get; set; }
}

using System.Collections.Concurrent;

namespace CenterManagement.Core.Features.UsersFeature.Students.Commands.Models.Import;

public class StudentImportRow
{
    public int RowNumber { get; set; }
    public string? FullName { get; set; }
    public string? Phone { get; set; }
    public string? PhoneParent { get; set; }
    public string? GroupName { get; set; }
    public string? GroupId { get; set; }
    public string? SubscriptionType { get; set; }
    public string? CustomMonthlyPrice { get; set; }
    public string? School { get; set; }
    public string? Notes { get; set; }
    public string? PhoneNormalized { get; set; }
    public string? PhoneParentNormalized { get; set; }
    public List<string> Errors { get; set; } = new();
    public bool IsValid { get; set; } = true;
    public bool IsDuplicateInFile { get; set; }
    public bool IsDuplicateInDb { get; set; }

    /// <summary>
    /// True when the duplicate student is inside the caller's scope, so the UI may
    /// offer "update". Duplicates outside the caller's scope never expose this option.
    /// </summary>
    public bool CanUpdate { get; set; }

    /// <summary>True when the group name is unknown but may be created on commit.</summary>
    public bool GroupWillBeCreated { get; set; }
}

public class StudentImportSession
{
    public string UserId { get; set; } = default!;
    public Guid CenterId { get; set; }
    public List<StudentImportRow> Rows { get; set; } = new();
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime ExpiresAt { get; set; } = DateTime.UtcNow.AddMinutes(30);

    /// <summary>Preview, Committing or Completed.</summary>
    public string Status { get; set; } = "Preview";

    /// <summary>The result of the commit, kept so a repeated call can return it.</summary>
    public StudentImportCommitResult? CommitResult { get; set; }
}

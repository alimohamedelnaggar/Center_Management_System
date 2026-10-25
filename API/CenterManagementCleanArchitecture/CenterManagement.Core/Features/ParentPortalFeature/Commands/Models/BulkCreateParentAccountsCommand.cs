using CenterManagement.Core.Features.ParentPortalFeature.Dtos;

namespace CenterManagement.Core.Features.ParentPortalFeature.Commands.Models;

/// <summary>
/// Creates (or reuses) the parent login account of every student matching the
/// filter in one go, so center staff never have to open each student one by
/// one. Issued from the dedicated "إنشاء حسابات أولياء الأمور" page.
/// </summary>
public class BulkCreateParentAccountsCommand : IRequest<Response<BulkCreateParentAccountsResult>>
{
    /// <summary>Restrict the run to one group. Null = every group of the scope.</summary>
    public Guid? GroupId { get; set; }

    /// <summary>Restrict the run to active / inactive students. Null = both.</summary>
    public bool? IsActive { get; set; }

    /// <summary>Free-text filter on the student name or one of the phone numbers.</summary>
    public string? Search { get; set; }

    /// <summary>
    /// When true, students that already have a parent account in this center
    /// are left alone instead of being reported as "linked".
    /// </summary>
    public bool SkipAlreadyLinked { get; set; }

    /// <summary>
    /// Upper bound on the number of students processed in one run.
    /// 0 (default) means "all students matching the filter".
    /// </summary>
    public int MaxStudents { get; set; } = 0;
}

namespace CenterManagement.Core.Features.ParentPortalFeature.Dtos;

/// <summary>One child as seen by his parent in the parent portal.</summary>
public class ParentChildDTO
{
    public Guid StudentId { get; set; }
    public string FullName { get; set; } = default!;
    public bool IsActive { get; set; }
}

/// <summary>
/// Outcome of creating a parent login account from a student record. The
/// temporary password is present only when a new account was created; when the
/// parent phone already belonged to a parent in the same center the child is
/// simply linked to that existing account.
/// </summary>
public class CreateParentAccountResult
{
    public Guid StudentId { get; set; }
    public string StudentName { get; set; } = default!;
    public string ParentPhone { get; set; } = default!;
    public string? TemporaryPassword { get; set; }
    public bool LinkedExistingAccount { get; set; }
}

/// <summary>
/// One parent login account produced by the bulk run. The temporary password
/// is present only for a brand new account; a reused account (the same parent
/// already had a login in this center) has none.
/// </summary>
public class ParentAccountCredential
{
    public Guid StudentId { get; set; }
    public string StudentName { get; set; } = default!;
    public string GroupName { get; set; } = default!;
    public string ParentPhone { get; set; } = default!;
    public string Username { get; set; } = default!;
    public string? TemporaryPassword { get; set; }
    public bool LinkedExistingAccount { get; set; }
    public bool PasswordChanged { get; set; }
}

/// <summary>A student whose parent account could not be prepared, with a reason.</summary>
public class SkippedParentAccount
{
    public Guid StudentId { get; set; }
    public string StudentName { get; set; } = default!;
    public string GroupName { get; set; } = default!;
    public string ParentPhone { get; set; } = default!;
    public string Reason { get; set; } = default!;
}

/// <summary>
/// Result of a bulk "create parent accounts" run: the accounts that were
/// created (with their one-time password), the ones that were linked to an
/// already existing parent account, and the students that were skipped.
/// </summary>
public class BulkCreateParentAccountsResult
{
    public List<ParentAccountCredential> Created { get; set; } = [];
    public List<ParentAccountCredential> Linked { get; set; } = [];
    public List<SkippedParentAccount> Skipped { get; set; } = [];

    /// <summary>
    /// Every student of the center with his parent phone and (when a new parent
    /// account was just created) the one-time password. Students whose parent
    /// already had an account are present too, with an empty password.
    /// </summary>
    public List<ParentAccountPrintRow> All { get; set; } = [];
}

/// <summary>One row of the "all parents" credentials sheet.</summary>
public class ParentAccountPrintRow
{
    public Guid StudentId { get; set; }
    public string StudentName { get; set; } = default!;
    public string? GroupName { get; set; }
    public string? ParentPhone { get; set; }
    public string? Username { get; set; }
    public bool HasAccount { get; set; }

    /// <summary>Only set for an account created during this run.</summary>
    public string? TemporaryPassword { get; set; }

    /// <summary>True when the parent already replaced the phone-based password.</summary>
    public bool PasswordChanged { get; set; }
}

/// <summary>Header of a single child inside the parent portal.</summary>
public class ParentChildSummaryDTO
{
    public Guid StudentId { get; set; }
    public string FullName { get; set; } = default!;
    public bool IsActive { get; set; }
}

/// <summary>One attendance record. No internal ids or phone numbers are exposed.</summary>
public class ParentChildAttendanceRecordDTO
{
    public DateOnly AttendanceDate { get; set; }
    public string StatusName { get; set; } = default!;
    public string GroupName { get; set; } = default!;
    public string DayOfWeek { get; set; } = default!;
    public string StartTime { get; set; } = default!;
    public string EndTime { get; set; } = default!;
    public string? Notes { get; set; }
}

/// <summary>Attendance summary + the most recent records for one child.</summary>
public class ParentChildAttendanceDTO
{
    public int TotalSessions { get; set; }
    public int PresentCount { get; set; }
    public int AbsentCount { get; set; }
    public int LateCount { get; set; }
    public int ExcusedCount { get; set; }
    public decimal AttendancePercentage { get; set; }
    public List<ParentChildAttendanceRecordDTO> Records { get; set; } = new();
}

/// <summary>A single graded component of an exam (paragraph, dictation, written).</summary>
public class ParentChildGradeComponentDTO
{
    public string ComponentName { get; set; } = default!;
    public decimal Mark { get; set; }
    public decimal TotalMarks { get; set; }
    public bool IsAbsent { get; set; }
}

/// <summary>One exam with the child's component marks.</summary>
public class ParentChildGradeExamDTO
{
    public string ExamName { get; set; } = default!;
    public DateTime ExamDate { get; set; }
    public List<ParentChildGradeComponentDTO> Components { get; set; } = new();
}

/// <summary>Grades section of the parent portal.</summary>
public class ParentChildGradesDTO
{
    public List<ParentChildGradeExamDTO> Exams { get; set; } = new();
}

/// <summary>A single online-exam result (published only).</summary>
public class ParentChildExamResultDTO
{
    public string ExamName { get; set; } = default!;
    public decimal Score { get; set; }
    public decimal TotalMark { get; set; }
    public DateTime? SubmittedAt { get; set; }
    public bool HasPendingManualGrading { get; set; }
}

/// <summary>Online-exam results section of the parent portal.</summary>
public class ParentChildExamResultsDTO
{
    public List<ParentChildExamResultDTO> Exams { get; set; } = new();
}

/// <summary>One payment line for the child. Internal ids are intentionally omitted.</summary>
public class ParentChildPaymentDTO
{
    public string GroupName { get; set; } = default!;
    public DateTime PaymentDate { get; set; }
    public DateOnly? BillingPeriod { get; set; }
    public decimal PaidAmount { get; set; }
    public decimal RemainingAmount { get; set; }
    public string StatusName { get; set; } = default!;
}

/// <summary>Payments section of the parent portal.</summary>
public class ParentChildPaymentsDTO
{
    public decimal TotalPaid { get; set; }
    public decimal TotalDue { get; set; }
    public DateTime? LastPaymentDate { get; set; }
    public bool IsOverdue { get; set; }
    public List<ParentChildPaymentDTO> Payments { get; set; } = new();
}

using CenterManagement.Core.Bases;
using CenterManagement.Core.Wrappers;
using MediatR;

namespace CenterManagement.Core.Features.UsersFeature.Students.Commands.Models.Import;

public class GetStudentImportTemplateQuery : IRequest<Response<byte[]>>
{
}

public class PreviewStudentImportCommand : IRequest<Response<StudentImportPreviewResult>>
{
    public IFormFile? File { get; set; }
}

public class CommitStudentImportCommand : IRequest<Response<StudentImportCommitResult>>
{
    public string SessionId { get; set; } = default!;
    public bool CreateStudentAccounts { get; set; } = true;
    public bool CreateParentAccounts { get; set; } = true;

    /// <summary>"skip" keeps an existing student untouched; "update" refreshes it.</summary>
    public string DuplicateMode { get; set; } = "skip";

    /// <summary>Create group names that do not exist yet (center-wide users only).</summary>
    public bool CreateMissingGroups { get; set; } = true;
}

public class GetStudentImportErrorsReportQuery : IRequest<Response<byte[]>>
{
    public string SessionId { get; set; } = default!;
}

public class StudentImportPreviewResult
{
    public string SessionId { get; set; } = default!;
    public int TotalRows { get; set; }
    public int ValidRows { get; set; }
    public int DuplicateInFile { get; set; }
    public int DuplicateInDb { get; set; }
    public int ErrorRows { get; set; }
    public List<StudentImportRow> Rows { get; set; } = new();
    public List<string> Headers { get; set; } = new();
}

public class StudentImportCommitResult
{
    public int Created { get; set; }
    public int Updated { get; set; }
    public int Skipped { get; set; }
    public int Failed { get; set; }
    public List<StudentImportError> Errors { get; set; } = new();
    public List<object> CreatedStudents { get; set; } = new();
    public List<string> CreatedGroups { get; set; } = new();
    public object? StudentAccounts { get; set; }
    public object? ParentAccounts { get; set; }

    /// <summary>True when this is the cached result of an earlier commit.</summary>
    public bool AlreadyCompleted { get; set; }
}

public class StudentImportError
{
    public int RowNumber { get; set; }
    public string? FullName { get; set; }
    public string Reason { get; set; } = default!;
}

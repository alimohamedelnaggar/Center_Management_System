using CenterManagement.Core.Bases;
using MediatR;

namespace CenterManagement.Core.Features.Platform.Commands.Models;

/// <summary>
/// One-off, idempotent migration: flags every student/parent account that still
/// signs in with its phone number so the user is forced to change it. Accounts
/// that already chose a permanent password are left untouched.
/// </summary>
public class FlagLegacyPhonePasswordsCommand : IRequest<Response<FlagLegacyPhonePasswordsResult>>
{
}

public class FlagLegacyPhonePasswordsResult
{
    public int Scanned { get; set; }
    public int Flagged { get; set; }
    public int AlreadyFlagged { get; set; }
    public int PasswordChanged { get; set; }
    public int Skipped { get; set; }
}

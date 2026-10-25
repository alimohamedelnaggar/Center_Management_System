namespace CenterManagement.Core.Features.UsersFeature.Assistant.Commands.Models;

/// <summary>
/// Asks the server to reset the login password of a single assistant that
/// belongs to the caller's center. The caller never supplies a password: the
/// server generates a one-time temporary password and returns it once.
/// </summary>
public class ResetAssistantPasswordCommand : IRequest<Response<AssistantCredential>>
{
    public Guid AssistantId { get; set; }
}

/// <summary>
/// One-time credentials handed back after an assistant password reset. The
/// temporary password is never persisted or logged in plaintext.
/// </summary>
public class AssistantCredential
{
    public Guid AssistantId { get; set; }
    public string AssistantName { get; set; } = default!;
    public string Username { get; set; } = default!;
    public string TemporaryPassword { get; set; } = default!;
}

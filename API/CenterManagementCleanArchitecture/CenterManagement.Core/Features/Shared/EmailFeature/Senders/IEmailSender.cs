namespace CenterManagement.Core.Features.Shared.EmailFeature.Senders;

/// <summary>
/// Single outgoing-mail boundary. Everything that needs to send a message
/// (reset codes, password-changed notices, email-change links) goes through
/// this interface so tests and development never touch a real SMTP server.
/// </summary>
public interface IEmailSender
{
    Task<bool> SendAsync(
        string email,
        string htmlMessage,
        string subject,
        CancellationToken cancellationToken = default);
}

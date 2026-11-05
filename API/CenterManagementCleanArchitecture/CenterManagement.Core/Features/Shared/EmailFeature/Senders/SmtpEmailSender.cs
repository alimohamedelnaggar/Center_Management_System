using System.Text.RegularExpressions;
using CenterManagement.Data.Helpers;
using MailKit.Security;
using Microsoft.Extensions.Logging;
using MimeKit;
using SmtpClient = MailKit.Net.Smtp.SmtpClient;

namespace CenterManagement.Core.Features.Shared.EmailFeature.Senders;

/// <summary>
/// Production mail transport. Credentials come from configuration only and are
/// never logged.
///
/// The socket security is configuration-driven (587 + STARTTLS, 465 +
/// SslOnConnect, ...). A port only supplies a fallback when no explicit option
/// is configured, so changing the port never silently changes the encryption.
/// </summary>
public sealed class SmtpEmailSender : IEmailSender
{
    private static readonly Regex EmailPattern = new(
        @"[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    private readonly EmailSettings _settings;
    private readonly ILogger<SmtpEmailSender> _logger;

    public SmtpEmailSender(EmailSettings settings, ILogger<SmtpEmailSender> logger)
    {
        _settings = settings;
        _logger = logger;
    }

    public async Task<bool> SendAsync(
        string email,
        string htmlMessage,
        string subject,
        CancellationToken cancellationToken = default)
    {
        var host = _settings.Host?.Trim() ?? string.Empty;
        var userName = _settings.FromEmail?.Trim() ?? string.Empty;
        var password = _settings.Password?.Trim() ?? string.Empty;
        var port = _settings.Port > 0 ? _settings.Port : 587;
        var (secureSocket, securityName) = ResolveSecureSocket(_settings, port);

        if (string.IsNullOrEmpty(host) ||
            string.IsNullOrEmpty(userName) ||
            string.IsNullOrEmpty(password) ||
            string.IsNullOrWhiteSpace(email))
        {
            _logger.LogError(
                "SMTP email was not sent because the mail settings are incomplete. " +
                "hostConfigured={HostConfigured} port={Port} security={Security} " +
                "fromConfigured={FromConfigured} passwordConfigured={PasswordConfigured} " +
                "recipientConfigured={RecipientConfigured}",
                !string.IsNullOrEmpty(host),
                port,
                securityName,
                !string.IsNullOrEmpty(userName),
                !string.IsNullOrEmpty(password),
                !string.IsNullOrWhiteSpace(email));

            return false;
        }

        _logger.LogInformation(
            "Sending email through SMTP host={Host} port={Port} security={Security}",
            host,
            port,
            securityName);

        try
        {
            using var message = new MimeMessage();
            message.From.Add(MailboxAddress.Parse(userName));
            message.To.Add(MailboxAddress.Parse(email));
            message.Subject = subject;
            message.Body = new BodyBuilder { HtmlBody = htmlMessage }.ToMessageBody();

            using var client = new SmtpClient();
            await client.ConnectAsync(host, port, secureSocket, cancellationToken);
            await client.AuthenticateAsync(userName, password, cancellationToken);
            await client.SendAsync(message, cancellationToken);
            await client.DisconnectAsync(quit: true, cancellationToken);

            _logger.LogInformation(
                "Email sent through SMTP host={Host} port={Port} security={Security}",
                host,
                port,
                securityName);

            return true;
        }
        catch (Exception exception)
        {
            // Only the exception type and the (redacted) server response are
            // logged. Recipient, sender, subject, body, codes and the password
            // must never reach the log.
            var serverMessage = Redact(exception.Message, email, userName);

            _logger.LogError(
                "Email send failed through SMTP host={Host} port={Port} security={Security} " +
                "errorType={ErrorType} smtpServerMessage={SmtpServerMessage}",
                host,
                port,
                securityName,
                exception.GetType().Name,
                serverMessage);

            // Never swallow: callers must be able to surface or retry the failure.
            throw;
        }
    }

    private static (SecureSocketOptions Options, string Name) ResolveSecureSocket(
        EmailSettings settings,
        int port)
    {
        var configured = settings.SecureSocket?.Trim();

        if (!string.IsNullOrEmpty(configured))
        {
            if (Enum.TryParse<SecureSocketOptions>(configured, ignoreCase: true, out var parsed) &&
                Enum.IsDefined(parsed))
            {
                return (parsed, parsed.ToString());
            }

            throw new InvalidOperationException(
                "Email:SecureSocket must be one of: None, Auto, StartTls, StartTlsWhenAvailable, SslOnConnect. " +
                $"Received '{configured}'.");
        }

        // Legacy fallback: an explicit EnableSsl=true means STARTTLS unless the
        // port is the implicit-TLS port.
        if (string.Equals(settings.EnableSsl?.Trim(), "true", StringComparison.OrdinalIgnoreCase))
        {
            return port == 465
                ? (SecureSocketOptions.SslOnConnect, nameof(SecureSocketOptions.SslOnConnect))
                : (SecureSocketOptions.StartTls, nameof(SecureSocketOptions.StartTls));
        }

        return port == 465
            ? (SecureSocketOptions.SslOnConnect, nameof(SecureSocketOptions.SslOnConnect))
            : (SecureSocketOptions.StartTls, nameof(SecureSocketOptions.StartTls));
    }

    private static string Redact(string? message, params string[] sensitiveValues)
    {
        if (string.IsNullOrWhiteSpace(message))
            return string.Empty;

        var redacted = message;
        foreach (var value in sensitiveValues)
        {
            if (!string.IsNullOrWhiteSpace(value))
                redacted = redacted.Replace(value, "[redacted]", StringComparison.OrdinalIgnoreCase);
        }

        return EmailPattern.Replace(redacted, "[redacted]");
    }
}

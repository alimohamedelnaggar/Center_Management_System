using System.Collections.Concurrent;
using Microsoft.Extensions.Logging;

namespace CenterManagement.Core.Features.Shared.EmailFeature.Senders;

/// <summary>
/// Development/test transport. Messages are captured in memory and never leave
/// the process, so a run can never email a real person.
///
/// The log line deliberately records nothing about the message: neither the
/// recipient, nor the subject, nor the body (which carries reset codes).
/// </summary>
public sealed class FakeEmailSender : IEmailSender
{
    private static readonly ConcurrentQueue<CapturedEmail> _sent = new();

    private readonly ILogger<FakeEmailSender> _logger;

    public FakeEmailSender(ILogger<FakeEmailSender> logger)
    {
        _logger = logger;
    }

    public static IReadOnlyCollection<CapturedEmail> Sent => _sent.ToArray();

    public static void Clear()
    {
        while (_sent.TryDequeue(out _))
        {
        }
    }

    public Task<bool> SendAsync(
        string email,
        string htmlMessage,
        string subject,
        CancellationToken cancellationToken = default)
    {
        _sent.Enqueue(new CapturedEmail(email, htmlMessage, subject));
        _logger.LogInformation("Outgoing email suppressed by the fake sender.");

        return Task.FromResult(true);
    }

    public sealed record CapturedEmail(string Email, string Message, string Subject);
}

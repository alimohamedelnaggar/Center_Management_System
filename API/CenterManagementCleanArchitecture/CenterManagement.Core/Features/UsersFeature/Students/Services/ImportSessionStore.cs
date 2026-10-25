using System.Collections.Concurrent;
using System.Security.Cryptography;
using CenterManagement.Core.Features.UsersFeature.Students.Commands.Models.Import;

namespace CenterManagement.Core.Features.UsersFeature.Students.Services;

/// <summary>
/// In-memory, per-user/per-center store for parsed import files. Entries live 30
/// minutes. The commit claim is guarded by a per-entry lock so two concurrent
/// requests can never import the same session twice.
/// </summary>
public sealed class ImportSessionStore : IImportSessionStore
{
    private sealed class Entry
    {
        public required StudentImportSession Session { get; init; }
        public object Gate { get; } = new();
    }

    private static readonly TimeSpan Lifetime = TimeSpan.FromMinutes(30);
    private static readonly RandomNumberGenerator Rng = RandomNumberGenerator.Create();

    private readonly ConcurrentDictionary<string, Entry> _entries = new(StringComparer.Ordinal);

    public string CreateSession(string userId, Guid centerId, StudentImportSession session)
    {
        session.UserId = userId;
        session.CenterId = centerId;
        session.CreatedAt = DateTime.UtcNow;
        session.ExpiresAt = DateTime.UtcNow.Add(Lifetime);
        session.Status = "Preview";
        session.CommitResult = null;

        var id = GenerateId();
        _entries[GetKey(id, userId, centerId)] = new Entry { Session = session };
        return id;
    }

    public StudentImportSession? GetSession(string sessionId, string userId, Guid centerId)
    {
        var key = GetKey(sessionId, userId, centerId);

        if (!_entries.TryGetValue(key, out var entry))
            return null;

        if (entry.Session.ExpiresAt < DateTime.UtcNow)
        {
            _entries.TryRemove(key, out _);
            return null;
        }

        return entry.Session;
    }

    public ImportSessionClaim TryClaim(
        string sessionId,
        string userId,
        Guid centerId,
        out StudentImportSession? session,
        out StudentImportCommitResult? cachedResult)
    {
        session = null;
        cachedResult = null;

        var key = GetKey(sessionId, userId, centerId);

        if (!_entries.TryGetValue(key, out var entry))
            return ImportSessionClaim.NotFound;

        if (entry.Session.ExpiresAt < DateTime.UtcNow)
        {
            _entries.TryRemove(key, out _);
            return ImportSessionClaim.NotFound;
        }

        lock (entry.Gate)
        {
            if (entry.Session.Status == "Completed")
            {
                session = entry.Session;
                cachedResult = entry.Session.CommitResult;
                return ImportSessionClaim.AlreadyCompleted;
            }

            if (entry.Session.Status == "Committing")
                return ImportSessionClaim.InProgress;

            entry.Session.Status = "Committing";
            session = entry.Session;
            return ImportSessionClaim.Claimed;
        }
    }

    public void Complete(
        string sessionId,
        string userId,
        Guid centerId,
        StudentImportCommitResult result)
    {
        var key = GetKey(sessionId, userId, centerId);

        if (!_entries.TryGetValue(key, out var entry))
            return;

        lock (entry.Gate)
        {
            entry.Session.CommitResult = result;
            entry.Session.Status = "Completed";
        }
    }

    public void ReleaseClaim(string sessionId, string userId, Guid centerId)
    {
        var key = GetKey(sessionId, userId, centerId);

        if (!_entries.TryGetValue(key, out var entry))
            return;

        lock (entry.Gate)
        {
            if (entry.Session.Status == "Committing")
                entry.Session.Status = "Preview";
        }
    }

    public void RemoveSession(string sessionId, string userId, Guid centerId)
        => _entries.TryRemove(GetKey(sessionId, userId, centerId), out _);

    private static string GetKey(string sessionId, string userId, Guid centerId)
        => $"import:{centerId}:{userId}:{sessionId}";

    private static string GenerateId()
    {
        var bytes = new byte[32];
        Rng.GetBytes(bytes);
        return Convert.ToBase64String(bytes).Replace("+", "-").Replace("/", "_").TrimEnd('=');
    }
}

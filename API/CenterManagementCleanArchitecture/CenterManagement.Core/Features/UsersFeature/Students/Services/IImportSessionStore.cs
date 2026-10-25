using CenterManagement.Core.Features.UsersFeature.Students.Commands.Models.Import;

namespace CenterManagement.Core.Features.UsersFeature.Students.Services;

public enum ImportSessionClaim
{
    /// <summary>The caller owns the session and must run the commit.</summary>
    Claimed = 0,

    /// <summary>Another request is already running the commit.</summary>
    InProgress = 1,

    /// <summary>The commit already finished; the cached result is available.</summary>
    AlreadyCompleted = 2,

    /// <summary>No session for this user/center, or it expired.</summary>
    NotFound = 3
}

public interface IImportSessionStore
{
    string CreateSession(string userId, Guid centerId, StudentImportSession session);

    StudentImportSession? GetSession(string sessionId, string userId, Guid centerId);

    /// <summary>
    /// Atomically marks the session as committing. Only one caller can win; the
    /// others get <see cref="ImportSessionClaim.InProgress"/> (or the cached
    /// result once the winner has completed).
    /// </summary>
    ImportSessionClaim TryClaim(
        string sessionId,
        string userId,
        Guid centerId,
        out StudentImportSession? session,
        out StudentImportCommitResult? cachedResult);

    /// <summary>Stores the final result and marks the session completed.</summary>
    void Complete(
        string sessionId,
        string userId,
        Guid centerId,
        StudentImportCommitResult result);

    /// <summary>Undoes a claim when the commit was rejected before doing any work.</summary>
    void ReleaseClaim(string sessionId, string userId, Guid centerId);

    void RemoveSession(string sessionId, string userId, Guid centerId);
}

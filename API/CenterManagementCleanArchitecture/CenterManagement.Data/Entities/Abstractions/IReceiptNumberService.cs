namespace CenterManagement.Data.Entities.Abstractions;

/// <summary>
/// Allocates the next sequential receipt number for a center. Implementations
/// must be safe under concurrency: the number is produced by an atomic
/// increment of the per-center counter, never by reading the maximum value.
/// </summary>
public interface IReceiptNumberService
{
    /// <summary>
    /// Atomically reserves (and returns) the next receipt number for the given
    /// center. Must be called inside the same transaction as the payment insert
    /// so that a rolled-back payment does not consume a number.
    /// </summary>
    Task<int> NextAsync(Guid centerId, CancellationToken cancellationToken = default);
}

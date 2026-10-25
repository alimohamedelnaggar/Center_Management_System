using CenterManagement.Data.Entities.Abstractions;
using CenterManagement.Infrustructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Storage;
using System.Data;
using System.Data.Common;

namespace CenterManagement.Infrustructure.Services;

/// <summary>
/// Per-center receipt number generator.
///
/// The counter lives in the <c>CenterReceiptCounters</c> table (one row per
/// center). The next number is produced with a single atomic statement so that
/// two concurrent payments can never get the same number:
/// <list type="bullet">
/// <item>SQL Server: <c>UPDATE ... SET LastNumber = LastNumber + 1 OUTPUT INSERTED.LastNumber</c></item>
/// <item>SQLite: <c>UPDATE ... SET LastNumber = LastNumber + 1 ... RETURNING LastNumber</c></item>
/// </list>
/// When the center has no counter row yet the row is created atomically
/// (<c>INSERT ... VALUES (@centerId, 1)</c>); if a concurrent request wins the
/// insert race the unique-key violation is caught and the atomic update is
/// retried. There is never a read-modify-write via MAX().
/// </summary>
public sealed class ReceiptNumberService : IReceiptNumberService
{
    private const string TableName = "CenterReceiptCounters";

    private readonly AppDbContext _context;

    public ReceiptNumberService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<int> NextAsync(Guid centerId, CancellationToken cancellationToken = default)
    {
        if (centerId == Guid.Empty)
            throw new ArgumentException(
                "A non-empty center id is required for receipt numbering.",
                nameof(centerId));

        var database = _context.Database;

        var connection = database.GetDbConnection();
        if (connection.State != ConnectionState.Open)
            await connection.OpenAsync(cancellationToken);

        var isSqlServer = database.ProviderName?.Contains("SqlServer", StringComparison.OrdinalIgnoreCase) == true;

        var quotedTable = isSqlServer ? $"[{TableName}]" : $"\"{TableName}\"";
        var qCenter = isSqlServer ? "[CenterId]" : "\"CenterId\"";
        var qLast = isSqlServer ? "[LastNumber]" : "\"LastNumber\"";

        var updateSql = isSqlServer
            ? $"UPDATE {quotedTable} SET {qLast} = {qLast} + 1 OUTPUT INSERTED.{qLast} WHERE {qCenter} = @centerId"
            : $"UPDATE {quotedTable} SET {qLast} = {qLast} + 1 WHERE {qCenter} = @centerId RETURNING {qLast}";

        var insertSql =
            $"INSERT INTO {quotedTable} ({qCenter}, {qLast}) VALUES (@centerId, 1)";

        // Fast path: the counter row already exists -> atomic increment.
        var updated = await ExecuteScalarAsync(database, connection, updateSql, centerId, cancellationToken);
        if (updated is not null && updated is not DBNull)
            return Convert.ToInt32(updated);

        // No row for this center yet: create it atomically with the first number.
        try
        {
            await ExecuteNonQueryAsync(database, connection, insertSql, centerId, cancellationToken);
            return 1;
        }
        catch (DbException)
        {
            // A concurrent request created the row first; take the next number
            // with the atomic update instead.
            var retried = await ExecuteScalarAsync(database, connection, updateSql, centerId, cancellationToken);
            if (retried is null || retried is DBNull)
                throw new InvalidOperationException(
                    $"Could not allocate a receipt number for center {centerId}.");

            return Convert.ToInt32(retried);
        }
    }

    private static async Task<object?> ExecuteScalarAsync(
        DatabaseFacade database,
        DbConnection connection,
        string sql,
        Guid centerId,
        CancellationToken cancellationToken)
    {
        await using var command = CreateCommand(database, connection, sql, centerId);
        return await command.ExecuteScalarAsync(cancellationToken);
    }

    private static async Task ExecuteNonQueryAsync(
        DatabaseFacade database,
        DbConnection connection,
        string sql,
        Guid centerId,
        CancellationToken cancellationToken)
    {
        await using var command = CreateCommand(database, connection, sql, centerId);
        await command.ExecuteNonQueryAsync(cancellationToken);
    }

    private static DbCommand CreateCommand(
        DatabaseFacade database,
        DbConnection connection,
        string sql,
        Guid centerId)
    {
        var command = connection.CreateCommand();
        command.CommandText = sql;

        // Enlist the raw command in the ambient EF transaction (when present) so
        // the increment commits or rolls back together with the payment insert.
        var transaction = database.CurrentTransaction;
        if (transaction is not null)
            command.Transaction = transaction.GetDbTransaction();

        var parameter = command.CreateParameter();
        parameter.ParameterName = "@centerId";
        parameter.Value = centerId;
        command.Parameters.Add(parameter);

        return command;
    }
}

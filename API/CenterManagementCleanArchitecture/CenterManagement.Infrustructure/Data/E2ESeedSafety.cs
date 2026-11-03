using System.Data.Common;

namespace CenterManagement.Infrustructure.Data;

/// <summary>
/// Pure, connection-free validation for seeding. It only parses the configured
/// connection string; it never opens a connection and never includes a password
/// in its result or exception messages.
/// </summary>
public sealed record E2ESeedSafetyResult(
    bool IsValid,
    string Server,
    string Database,
    IReadOnlyList<string> Errors);

public static class E2ESeedSafety
{
    public const string RequiredEnvironment = "E2E";
    public const string AllowSeedEnvironmentVariable = "E2E_ALLOW_SEED";
    public const string RequiredAllowSeedValue = "1";

    private static readonly HashSet<string> AllowedLocalServers = new(StringComparer.OrdinalIgnoreCase)
    {
        "localhost",
        "127.0.0.1",
        "::1",
        "(localdb)",
        // CI service names. Add a host here only if it is resolved locally.
        "sqlserver",
        "mssql"
    };

    /// <summary>
    /// Validates every condition required before the E2E seeder may touch a
    /// database. This must be called before resolving AppDbContext or doing any
    /// database operation.
    /// </summary>
    public static E2ESeedSafetyResult Validate(
        string? environmentName,
        string? connectionString,
        string? allowSeed)
    {
        var errors = new List<string>();
        var target = ReadTarget(connectionString);

        if (target.Error is not null)
            errors.Add(target.Error);

        if (!string.Equals(environmentName, RequiredEnvironment, StringComparison.OrdinalIgnoreCase))
            errors.Add($"Environment must be '{RequiredEnvironment}'.");

        if (!string.Equals(allowSeed?.Trim(), RequiredAllowSeedValue, StringComparison.Ordinal))
            errors.Add($"{AllowSeedEnvironmentVariable}=1 must be set explicitly.");

        if (!IsLocalServer(target.Server))
            errors.Add($"Server '{target.Server}' is not an allowed local/CI E2E host.");

        if (!target.Database.Contains("E2E", StringComparison.OrdinalIgnoreCase))
            errors.Add("Database name must contain 'E2E'.");

        return new E2ESeedSafetyResult(
            errors.Count == 0,
            target.Server,
            target.Database,
            errors);
    }

    /// <summary>
    /// A narrower guard for the Development-only test-center seeder. That seeder
    /// must never write to a remote database, even when the host is Development.
    /// </summary>
    public static E2ESeedSafetyResult ValidateLocalServer(string? connectionString)
    {
        var errors = new List<string>();
        var target = ReadTarget(connectionString);

        if (target.Error is not null)
            errors.Add(target.Error);

        if (!IsLocalServer(target.Server))
            errors.Add($"Server '{target.Server}' is not an allowed local database host.");

        return new E2ESeedSafetyResult(
            errors.Count == 0,
            target.Server,
            target.Database,
            errors);
    }

    public static E2ESeedSafetyResult ValidateOrThrow(
        string? environmentName,
        string? connectionString,
        string? allowSeed)
    {
        var result = Validate(environmentName, connectionString, allowSeed);

        if (result.IsValid)
            return result;

        throw new InvalidOperationException(
            "E2E seed refused before opening any database connection. " +
            $"Server='{result.Server}'; Database='{result.Database}'. " +
            string.Join(" ", result.Errors));
    }

    public static void ValidateLocalServerOrThrow(string? connectionString, string purpose)
    {
        var result = ValidateLocalServer(connectionString);

        if (result.IsValid)
            return;

        throw new InvalidOperationException(
            $"Seed refused before opening any database connection ({purpose}). " +
            $"Server='{result.Server}'; Database='{result.Database}'. " +
            string.Join(" ", result.Errors));
    }

    public static bool IsLocalServer(string? server)
    {
        if (string.IsNullOrWhiteSpace(server))
            return false;

        return AllowedLocalServers.Contains(NormalizeServer(server));
    }

    private static (string Server, string Database, string? Error) ReadTarget(string? connectionString)
    {
        if (string.IsNullOrWhiteSpace(connectionString))
            return ("<missing>", "<missing>", "Connection string is missing.");

        try
        {
            var builder = new DbConnectionStringBuilder
            {
                ConnectionString = connectionString
            };

            var server = GetValue(builder, "Server", "Data Source") ?? "<missing>";
            var database = GetValue(builder, "Database", "Initial Catalog") ?? "<missing>";

            return (server, database, null);
        }
        catch (Exception)
        {
            // Deliberately do not include the parser exception: it may contain
            // the original connection string.
            return ("<unparsable>", "<unparsable>", "Connection string could not be parsed.");
        }
    }

    private static string? GetValue(DbConnectionStringBuilder builder, params string[] keys)
    {
        foreach (var key in keys)
        {
            if (builder.TryGetValue(key, out var value) && value is not null)
                return value.ToString();
        }

        return null;
    }

    private static string NormalizeServer(string server)
    {
        var value = server.Trim();

        if (value.StartsWith("tcp:", StringComparison.OrdinalIgnoreCase))
            value = value[4..].Trim();

        var slash = value.IndexOf('\\');
        if (slash > 0)
            value = value[..slash];

        if (value.StartsWith("[", StringComparison.Ordinal) && value.Contains(']'))
            value = value[1..value.IndexOf(']')];
        else if (value.Count(c => c == ':') == 1)
            value = value[..value.IndexOf(':')];

        var comma = value.IndexOf(',');
        if (comma >= 0)
            value = value[..comma];

        return value.Trim();
    }
}

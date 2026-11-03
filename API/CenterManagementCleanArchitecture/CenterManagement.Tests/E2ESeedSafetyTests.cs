using CenterManagement.Infrustructure.Data;

namespace CenterManagement.Tests;

/// <summary>
/// Connection-free tests for the seed safety gates. These tests must never
/// create an AppDbContext or open a database connection.
/// </summary>
public sealed class E2ESeedSafetyTests
{
    private const string LocalE2EConnection =
        "Server=(localdb)\\MSSQLLocalDB;Database=CenterManagement_E2E;" +
        "Trusted_Connection=True;Encrypt=False;TrustServerCertificate=True";

    [Fact]
    public void Valid_LocalDb_E2E_With_Explicit_Allow_Is_Accepted()
    {
        var result = E2ESeedSafety.Validate("E2E", LocalE2EConnection, "1");

        Assert.True(result.IsValid, string.Join(" ", result.Errors));
        Assert.Contains("CenterManagement_E2E", result.Database);
    }

    [Theory]
    [InlineData("localhost,1433")]
    [InlineData("127.0.0.1,1433")]
    [InlineData("tcp:localhost,1433")]
    [InlineData("[::1],1433")]
    [InlineData("sqlserver")]
    [InlineData("mssql")]
    public void Allowed_Local_And_Ci_Hosts_Are_Accepted(string server)
    {
        var connectionString =
            $"Server={server};Database=CenterManagement_E2E;" +
            "User Id=test;Password=unit-test-placeholder;Encrypt=False";

        var result = E2ESeedSafety.Validate("e2e", connectionString, "1");

        Assert.True(result.IsValid, string.Join(" ", result.Errors));
    }

    [Theory]
    [InlineData("db73301.public.databaseasp.net")]
    [InlineData("db.example.test")]
    [InlineData("localhost.example.test")]
    public void Remote_Server_Is_Rejected(string server)
    {
        var connectionString =
            $"Server={server};Database=CenterManagement_E2E;" +
            "User Id=test;Password=unit-test-placeholder;Encrypt=False";

        var result = E2ESeedSafety.Validate("E2E", connectionString, "1");

        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, error => error.Contains("not an allowed", StringComparison.OrdinalIgnoreCase));
    }

    [Fact]
    public void Database_Without_E2E_In_Name_Is_Rejected()
    {
        var connectionString =
            "Server=(localdb)\\MSSQLLocalDB;Database=CenterManagement;" +
            "Trusted_Connection=True;Encrypt=False;TrustServerCertificate=True";

        var result = E2ESeedSafety.Validate("E2E", connectionString, "1");

        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, error => error.Contains("must contain 'E2E'", StringComparison.OrdinalIgnoreCase));
    }

    [Fact]
    public void Non_E2E_Environment_Is_Rejected()
    {
        var result = E2ESeedSafety.Validate("Development", LocalE2EConnection, "1");

        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, error => error.Contains("Environment must be 'E2E'", StringComparison.OrdinalIgnoreCase));
    }

    [Fact]
    public void Missing_Or_Non_Exact_Allow_Seed_Flag_Is_Rejected()
    {
        var missing = E2ESeedSafety.Validate("E2E", LocalE2EConnection, null);
        var nonExact = E2ESeedSafety.Validate("E2E", LocalE2EConnection, "true");

        Assert.False(missing.IsValid);
        Assert.False(nonExact.IsValid);
        Assert.Contains(missing.Errors, error => error.Contains("E2E_ALLOW_SEED=1", StringComparison.Ordinal));
        Assert.Contains(nonExact.Errors, error => error.Contains("E2E_ALLOW_SEED=1", StringComparison.Ordinal));
    }

    [Fact]
    public void Error_Message_Contains_Server_And_Database_But_Not_Password()
    {
        const string password = "unit-test-placeholder";
        var connectionString =
            "Server=db.example.test;Database=CenterManagement_E2E;" +
            $"User Id=test;Password={password};Encrypt=False";

        var exception = Assert.Throws<InvalidOperationException>(() =>
            E2ESeedSafety.ValidateOrThrow("E2E", connectionString, "1"));

        Assert.Contains("db.example.test", exception.Message);
        Assert.Contains("CenterManagement_E2E", exception.Message);
        Assert.DoesNotContain(password, exception.Message);
    }

    [Fact]
    public void Local_Only_Guard_Rejects_Remote_Test_Center_Seeding()
    {
        var remote =
            "Server=db.example.test;Database=CenterManagement;" +
            "User Id=test;Password=unit-test-placeholder;Encrypt=False";

        var result = E2ESeedSafety.ValidateLocalServer(remote);

        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, error => error.Contains("not an allowed local", StringComparison.OrdinalIgnoreCase));
    }

    [Fact]
    public void Local_Only_Guard_Allows_Local_Development_Database()
    {
        var local =
            "Server=(localdb)\\MSSQLLocalDB;Database=CenterManagement;" +
            "Trusted_Connection=True;Encrypt=False;TrustServerCertificate=True";

        var result = E2ESeedSafety.ValidateLocalServer(local);

        Assert.True(result.IsValid, string.Join(" ", result.Errors));
    }

    [Fact]
    public void Missing_Connection_String_Is_Rejected_Without_Opening_A_Connection()
    {
        var result = E2ESeedSafety.Validate("E2E", null, "1");

        Assert.False(result.IsValid);
        Assert.Equal("<missing>", result.Server);
        Assert.Contains(result.Errors, error => error.Contains("Connection string is missing", StringComparison.OrdinalIgnoreCase));
    }
}

using CenterManagement.Data.Entities.Abstractions;
using CenterManagement.Infrustructure.Data;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

namespace CenterManagement.Tests;

/// <summary>
/// Mutable <see cref="ITenantContext"/> used to impersonate a request
/// (role / user / center) inside the isolation tests.
/// </summary>
public sealed class TestTenantContext : ITenantContext
{
    public Guid? UserId { get; set; }

    public Guid? CenterId { get; set; }

    public string? Role { get; set; }

    public bool IsCenterAdmin { get; set; }

    public bool IsUnrestricted { get; set; }
}

/// <summary>
/// Spins up a real <see cref="AppDbContext"/> on an in-memory SQLite database so
/// the tests exercise the actual model, global query filters and query
/// extensions (no mocking of the DB).
/// </summary>
public sealed class TestDatabase : IDisposable
{
    private readonly SqliteConnection _connection;

    public AppDbContext Context { get; }

    public TestTenantContext Tenant { get; }

    public TestDatabase()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();

        Tenant = new TestTenantContext { IsUnrestricted = true };

        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlite(_connection)
            .Options;

        Context = new AppDbContext(options, Tenant);
        Context.Database.EnsureCreated();
    }

    public void Dispose()
    {
        Context.Dispose();
        _connection.Dispose();
    }
}

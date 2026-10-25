using System.Linq;
using System.Reflection;
using CenterManagement.Data.AppMetaData;
using CenterManagement.Infrustructure.Data.Migrations;
using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.EntityFrameworkCore.Migrations.Operations;

namespace CenterManagement.Tests;

/// <summary>
/// Guards the module backfill against drift: the SQL embedded in the
/// <c>AddSubscriptionsAndCenterModules</c> migration must insert exactly the
/// keys from <see cref="ModuleKeys.All"/> (and never a "core" row).
/// </summary>
public sealed class ModuleBackfillDriftTests
{
    [Fact]
    public void ModulesBackfill_InsertsExactlyModuleKeysAll_AndNoCoreRow()
    {
        var builder = new MigrationBuilder("Microsoft.EntityFrameworkCore.SqlServer");

        var migration = new AddSubscriptionsAndCenterModules();
        typeof(AddSubscriptionsAndCenterModules)
            .GetMethod("Up", BindingFlags.Instance | BindingFlags.NonPublic)!
            .Invoke(migration, new object[] { builder });

        var sql = string.Concat(
            builder.Operations
                .OfType<SqlOperation>()
                .Select(o => o.Sql)
                .Where(s => !string.IsNullOrEmpty(s)));

        Assert.Contains("INSERT INTO [CenterModules]", sql);

        foreach (var key in ModuleKeys.All)
            Assert.Contains($"('{key}')", sql);

        // "core" is always on and must never be stored as a row.
        Assert.DoesNotContain($"('{ModuleKeys.Core}')", sql);
    }
}

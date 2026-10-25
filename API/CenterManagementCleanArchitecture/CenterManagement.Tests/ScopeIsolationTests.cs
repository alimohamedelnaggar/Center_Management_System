using CenterManagement.Core.Bases;
using CenterManagement.Data.AppMetaData;
using CenterManagement.Data.Entities.Users;
using CenterManagement.Infrustructure.Repositories.Base;
using CenterManagement.Infrustructure.Services;
using Microsoft.EntityFrameworkCore;

namespace CenterManagement.Tests;

public sealed class ScopeIsolationTests
{
    [Fact]
    public async Task Teacher_Resolves_Only_Own_Group()
    {
        using var db = new TestDatabase();
        var seed = TestData.Seed(db);

        db.Tenant.Role = AppRoles.Teacher;
        db.Tenant.UserId = seed.TeacherA;
        db.Tenant.CenterId = seed.CenterA;
        db.Tenant.IsUnrestricted = false;

        var scopeService = new UserScopeService(db.Context, db.Tenant);

        var scope = await scopeService.ResolveAsync();

        Assert.False(scope.CenterWide);
        Assert.Equal(new[] { seed.GroupA }, scope.GroupIds);
        Assert.True(scope.Allows(seed.GroupA));
        Assert.False(scope.Allows(seed.GroupB));
    }

    [Fact]
    public async Task Teacher_Query_Returns_Only_His_Group_And_Students()
    {
        using var db = new TestDatabase();
        var seed = TestData.Seed(db);

        db.Tenant.Role = AppRoles.Teacher;
        db.Tenant.UserId = seed.TeacherA;
        db.Tenant.CenterId = seed.CenterA;
        db.Tenant.IsUnrestricted = false;

        var scopeService = new UserScopeService(db.Context, db.Tenant);
        var scope = await scopeService.ResolveAsync();

        var groupIds = await db.Context.Groups
            .ScopeToUser(scope)
            .Select(g => g.Id)
            .ToListAsync();

        Assert.Equal(new[] { seed.GroupA }, groupIds);

        var studentIds = await db.Context.Students
            .ScopeToUser(scope)
            .Select(s => s.Id)
            .ToListAsync();

        Assert.Equal(new[] { seed.StudentA }, studentIds);
    }

    [Fact]
    public async Task Teacher_Cannot_Reach_Another_Teachers_Student()
    {
        using var db = new TestDatabase();
        var seed = TestData.Seed(db);

        db.Tenant.Role = AppRoles.Teacher;
        db.Tenant.UserId = seed.TeacherA;
        db.Tenant.CenterId = seed.CenterA;
        db.Tenant.IsUnrestricted = false;

        var scopeService = new UserScopeService(db.Context, db.Tenant);

        Assert.True(await scopeService.AllowsStudentAsync(seed.StudentA));
        Assert.False(await scopeService.AllowsStudentAsync(seed.StudentB));
    }

    [Fact]
    public async Task CenterOwner_Is_Not_Restricted()
    {
        using var db = new TestDatabase();
        var seed = TestData.Seed(db);

        db.Tenant.Role = AppRoles.CenterOwner;
        db.Tenant.UserId = Guid.NewGuid();
        db.Tenant.CenterId = seed.CenterA;
        db.Tenant.IsUnrestricted = false;

        var scopeService = new UserScopeService(db.Context, db.Tenant);

        var scope = await scopeService.ResolveAsync();

        Assert.True(scope.CenterWide);
    }

    [Fact]
    public async Task SuperAdmin_Is_Unrestricted()
    {
        using var db = new TestDatabase();
        var seed = TestData.Seed(db);

        db.Tenant.Role = AppRoles.SuperAdmin;
        db.Tenant.UserId = Guid.NewGuid();
        db.Tenant.CenterId = null;
        db.Tenant.IsUnrestricted = true;

        var scopeService = new UserScopeService(db.Context, db.Tenant);

        var scope = await scopeService.ResolveAsync();

        Assert.True(scope.CenterWide);
    }

    [Fact]
    public async Task Assistant_Query_Is_Isolated_To_Center()
    {
        using var db = new TestDatabase();
        var seed = TestData.Seed(db);

        // Impersonate a CenterOwner of Center A, then read the assistants.
        db.Tenant.Role = AppRoles.CenterOwner;
        db.Tenant.UserId = null;
        db.Tenant.CenterId = seed.CenterA;
        db.Tenant.IsUnrestricted = false;

        var repositoryManager = new RepositoryManager(db.Context, db.Tenant);

        var query = await repositoryManager.AssistantRepository.GetAssistantsQueryableAsync();
        var assistantIds = query.Select(a => a.Id).ToList();

        Assert.Contains(seed.AssistantA, assistantIds);
        Assert.DoesNotContain(seed.AssistantB, assistantIds);
    }

    [Fact]
    public async Task Assistant_Query_As_SuperAdmin_Returns_All_Centers()
    {
        using var db = new TestDatabase();
        var seed = TestData.Seed(db);

        db.Tenant.Role = AppRoles.SuperAdmin;
        db.Tenant.UserId = Guid.NewGuid();
        db.Tenant.CenterId = null;
        db.Tenant.IsUnrestricted = true;

        var repositoryManager = new RepositoryManager(db.Context, db.Tenant);

        var query = await repositoryManager.AssistantRepository.GetAssistantsQueryableAsync();
        var assistantIds = query.Select(a => a.Id).ToList();

        Assert.Contains(seed.AssistantA, assistantIds);
        Assert.Contains(seed.AssistantB, assistantIds);
    }
}

using CenterManagement.Core.Features.Subscriptions;
using CenterManagement.Data.AppMetaData;

namespace CenterManagement.Tests;

/// <summary>
/// Pure tests for the module dependency graph used by the SuperAdmin module editor:
/// enabling a module auto-enables its prerequisites, and disabling a prerequisite
/// is blocked unless the caller opts in to disabling the dependents too.
/// </summary>
public sealed class CenterModuleResolverTests
{
    [Fact]
    public void Enabling_OnlineExams_AutoEnables_QuestionBank()
    {
        var result = CenterModuleResolver.Resolve(
            [ModuleKeys.OnlineExams], currentlyEnabled: [], disableDependents: false);

        Assert.False(result.Blocked);
        Assert.Contains(ModuleKeys.OnlineExams, result.Enabled);
        Assert.Contains(ModuleKeys.QuestionBank, result.Enabled);
        Assert.Contains(ModuleKeys.QuestionBank, result.AutoEnabled);
        Assert.Contains(ModuleKeys.OnlineExams, result.Requested);
    }

    [Fact]
    public void Enabling_ParentPortal_AutoEnables_AttendanceAndPayments()
    {
        var result = CenterModuleResolver.Resolve(
            [ModuleKeys.ParentPortal], currentlyEnabled: [], disableDependents: false);

        Assert.Contains(ModuleKeys.Attendance, result.Enabled);
        Assert.Contains(ModuleKeys.Payments, result.Enabled);
        Assert.Contains(ModuleKeys.Attendance, result.AutoEnabled);
        Assert.Contains(ModuleKeys.Payments, result.AutoEnabled);
        // The parent portal no longer depends on the student portal.
        Assert.DoesNotContain(ModuleKeys.StudentPortal, result.Enabled);
    }

    [Fact]
    public void Disabling_Attendance_IsBlocked_While_ParentPortal_StaysEnabled()
    {
        var requested = ModuleKeys.All.Where(key => key != ModuleKeys.Attendance).ToList();

        var result = CenterModuleResolver.Resolve(requested, ModuleKeys.All, disableDependents: false);

        Assert.True(result.Blocked);
        var conflict = Assert.Single(result.Conflicts);
        Assert.Equal(ModuleKeys.Attendance, conflict.Module);
        Assert.Contains(ModuleKeys.ParentPortal, conflict.Dependents);
    }

    [Fact]
    public void Disabling_RequiredModule_IsBlocked_WhenItsDependentStaysEnabled()
    {
        var requested = ModuleKeys.All.Where(key => key != ModuleKeys.QuestionBank).ToList();

        var result = CenterModuleResolver.Resolve(requested, ModuleKeys.All, disableDependents: false);

        Assert.True(result.Blocked);
        var conflict = Assert.Single(result.Conflicts);
        Assert.Equal(ModuleKeys.QuestionBank, conflict.Module);
        Assert.Contains(ModuleKeys.OnlineExams, conflict.Dependents);

        // Nothing changes when blocked: the effective set equals the current one.
        Assert.Equal(
            ModuleKeys.All.OrderBy(k => k),
            result.Enabled.OrderBy(k => k));
    }

    [Fact]
    public void Disabling_RequiredModule_DisablesDependents_WhenOptedIn()
    {
        var requested = ModuleKeys.All.Where(key => key != ModuleKeys.QuestionBank).ToList();

        var result = CenterModuleResolver.Resolve(requested, ModuleKeys.All, disableDependents: true);

        Assert.False(result.Blocked);
        Assert.Empty(result.Conflicts);
        Assert.DoesNotContain(ModuleKeys.QuestionBank, result.Enabled);
        Assert.DoesNotContain(ModuleKeys.OnlineExams, result.Enabled);
        Assert.Contains(ModuleKeys.OnlineExams, result.ForceDisabled);
    }

    [Fact]
    public void Disabling_BothModuleAndItsDependent_IsAllowed_WithoutOptIn()
    {
        var requested = ModuleKeys.All
            .Where(key => key != ModuleKeys.QuestionBank && key != ModuleKeys.OnlineExams)
            .ToList();

        var result = CenterModuleResolver.Resolve(requested, ModuleKeys.All, disableDependents: false);

        Assert.False(result.Blocked);
        Assert.DoesNotContain(ModuleKeys.QuestionBank, result.Enabled);
        Assert.DoesNotContain(ModuleKeys.OnlineExams, result.Enabled);
        Assert.Empty(result.ForceDisabled);
    }

    [Fact]
    public void UnknownAndCoreKeys_AreIgnored()
    {
        var result = CenterModuleResolver.Resolve(
            [ModuleKeys.Core, "does_not_exist", ModuleKeys.Attendance],
            currentlyEnabled: [],
            disableDependents: false);

        Assert.Equal([ModuleKeys.Attendance], result.Enabled.OrderBy(k => k));
    }
}

using System.Reflection;
using CenterManagement.Api.Authorization;
using CenterManagement.Api.Base;
using CenterManagement.Data.AppMetaData;
using Microsoft.AspNetCore.Mvc;

namespace CenterManagement.Tests;

/// <summary>
/// Proves every controller action is deliberately classified: either it is
/// gated behind a feature module (<see cref="RequireModuleAttribute"/>), or it is
/// explicitly marked core / platform / self-checked. This fails loudly whenever a
/// new endpoint is added without a decision about its module.
/// </summary>
public sealed class ModuleCoverageTests
{
    [Fact]
    public void EveryControllerAction_IsModuleGated_CoreOrExplicitlyExempt()
    {
        var uncovered = UncoveredActions();

        Assert.True(
            uncovered.Count == 0,
            "Unclassified controller actions — add [RequireModule(...)], [CoreEndpoint], " +
            "[PlatformEndpoint] or [SelfModuleChecked]:\n" + string.Join("\n", uncovered));
    }

    /// <summary>
    /// Guard against typos: every <c>RequireModule("key")</c> must reference a
    /// real module key (<see cref="ModuleKeys.All"/> or <see cref="ModuleKeys.Core"/>),
    /// otherwise the endpoint would be permanently unreachable.
    /// </summary>
    [Fact]
    public void EveryRequireModuleKey_IsKnown()
    {
        var assembly = typeof(AppControllerBase).Assembly;

        var unknown = new List<string>();

        var members = assembly.GetTypes()
            .Where(t => t is { IsAbstract: false, IsClass: true })
            .Where(t => typeof(ControllerBase).IsAssignableFrom(t))
            .Where(t => t.Name.EndsWith("Controller", StringComparison.Ordinal))
            .SelectMany(t => new MemberInfo[] { t }.Concat(
                t.GetMethods(BindingFlags.Public | BindingFlags.Instance | BindingFlags.DeclaredOnly)
                    .Where(m => !m.IsSpecialName)));

        foreach (var member in members)
        {
            foreach (var attr in member.GetCustomAttributes(typeof(RequireModuleAttribute), true).Cast<RequireModuleAttribute>())
            {
                if (!ModuleKeys.IsKnown(attr.ModuleKey))
                    unknown.Add($"{member.DeclaringType?.Name}.{member.Name} -> '{attr.ModuleKey}'");
            }
        }

        Assert.True(unknown.Count == 0, "Unknown module key(s):\n" + string.Join("\n", unknown));
    }

    private static List<string> UncoveredActions()
    {
        var assembly = typeof(AppControllerBase).Assembly;

        var controllers = assembly.GetTypes()
            .Where(t => t is { IsAbstract: false, IsClass: true })
            .Where(t => typeof(ControllerBase).IsAssignableFrom(t))
            .Where(t => t.Name.EndsWith("Controller", StringComparison.Ordinal))
            .ToList();

        Assert.NotEmpty(controllers);

        var uncovered = new List<string>();

        foreach (var controller in controllers)
        {
            var classCovered = IsCovered(controller);

            var actions = controller
                .GetMethods(BindingFlags.Public | BindingFlags.Instance | BindingFlags.DeclaredOnly)
                .Where(m => !m.IsSpecialName)
                .ToList();

            foreach (var action in actions)
            {
                if (!classCovered && !IsCovered(action))
                    uncovered.Add($"{controller.Name}.{action.Name}");
            }
        }

        return uncovered;
    }

    private static bool IsCovered(MemberInfo member) =>
        member.GetCustomAttributes(typeof(RequireModuleAttribute), true).Any()
        || member.GetCustomAttributes(typeof(CoreEndpointAttribute), true).Any()
        || member.GetCustomAttributes(typeof(PlatformEndpointAttribute), true).Any()
        || member.GetCustomAttributes(typeof(SelfModuleCheckedAttribute), true).Any();
}

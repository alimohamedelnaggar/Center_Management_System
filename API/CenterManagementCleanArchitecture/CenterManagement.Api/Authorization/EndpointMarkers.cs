namespace CenterManagement.Api.Authorization;

/// <summary>
/// Marks a controller/action as part of the always-on core (auth, users, groups,
/// sessions, profile, dashboard shell, ...) or explicitly handled by another
/// mechanism. Used by <c>ModuleCoverageTests</c> to prove every endpoint is
/// deliberately classified.
/// </summary>
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method)]
public sealed class CoreEndpointAttribute : Attribute
{
}

/// <summary>
/// Marks a controller/action as a platform (SuperAdmin) endpoint that is not
/// scoped to a single center and therefore not gated by center modules.
/// </summary>
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method)]
public sealed class PlatformEndpointAttribute : Attribute
{
}

/// <summary>
/// Marks a controller/action that is anonymous and performs its own module
/// checks inside the handler (e.g. the public student card, which resolves the
/// center from the scanned QR code).
/// </summary>
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method)]
public sealed class SelfModuleCheckedAttribute : Attribute
{
}

using CenterManagement.Data.AppMetaData;
using CenterManagement.Data.Entities.Abstractions;
using CenterManagement.Infrustructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace CenterManagement.Infrustructure.Services;

/// <summary>
/// Default <see cref="ICenterModuleService"/> backed by <c>CenterModules</c>.
/// Queries ignore the tenant filter (so the check also works from middleware and
/// anonymous lookups) and caches the enabled set for a short TTL to avoid a DB
/// round-trip on every request. The cache is per process and invalidated via
/// <see cref="Invalidate"/> when a SuperAdmin changes a center's modules.
/// </summary>
public sealed class CenterModuleService : ICenterModuleService
{
    private static readonly TimeSpan CacheTtl = TimeSpan.FromSeconds(45);

    private readonly AppDbContext _context;
    private readonly IMemoryCache _cache;

    public CenterModuleService(AppDbContext context, IMemoryCache cache)
    {
        _context = context;
        _cache = cache;
    }

    public async Task<IReadOnlySet<string>> GetEnabledModulesAsync(
        Guid centerId,
        CancellationToken cancellationToken = default)
    {
        var cacheKey = CacheKey(centerId);

        if (_cache.TryGetValue(cacheKey, out IReadOnlySet<string>? cached) && cached is not null)
            return cached;

        var keys = await _context.CenterModules
            .IgnoreQueryFilters()
            .AsNoTracking()
            .Where(m => m.CenterId == centerId && !m.IsDeleted && m.IsEnabled)
            .Select(m => m.ModuleKey)
            .ToListAsync(cancellationToken);

        var set = keys.ToHashSet(StringComparer.OrdinalIgnoreCase);
        _cache.Set(cacheKey, (IReadOnlySet<string>)set, CacheTtl);

        return set;
    }

    public async Task<bool> IsEnabledAsync(
        Guid centerId,
        string moduleKey,
        CancellationToken cancellationToken = default)
    {
        // Core (and an unset key) is always allowed.
        if (string.IsNullOrWhiteSpace(moduleKey) || moduleKey == ModuleKeys.Core)
            return true;

        var enabled = await GetEnabledModulesAsync(centerId, cancellationToken);
        return enabled.Contains(moduleKey);
    }

    public void Invalidate(Guid centerId) => _cache.Remove(CacheKey(centerId));

    private static string CacheKey(Guid centerId) => $"center_modules:{centerId}";
}

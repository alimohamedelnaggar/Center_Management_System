using CenterManagement.Data.Entities.Abstractions;
using CenterManagement.Infrustructure.InfrastructureBases.Bases;
using CenterManagement.Infrustructure.Interceptors;
using CenterManagement.Infrustructure.Services;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Configuration;

namespace CenterManagement.Infrustructure;

public static class ModuleInfrastructureDependencies
{
    public static IServiceCollection AddInfrastructureDependencies(this IServiceCollection services
        , IConfiguration configuration)
    {
        // Resolves the current center (tenant) from the request claims.
        services.AddScoped<ITenantContext, TenantContext>();

        // Resolves how the current user's data access is narrowed inside the center.
        services.AddScoped<IUserScopeService, UserScopeService>();

        // Allocates per-center sequential receipt numbers (atomic counter).
        services.AddScoped<IReceiptNumberService, ReceiptNumberService>();

        // Append-only audit trail for privileged platform operations.
        services.AddScoped<IAuditLogService, AuditLogService>();

        // Central rule set deciding whether a user/center may currently operate.
        services.AddScoped<IAccountAccessService, AccountAccessService>();

        // Single source of "now" so tests can control the clock (grace/expiry).
        services.AddSingleton(TimeProvider.System);

        // Per-center feature modules ("what the center paid for"), cached briefly.
        services.AddMemoryCache();
        services.AddScoped<ICenterModuleService, CenterModuleService>();

        services.AddDbContext<AppDbContext>((sp, options) =>
        {
            options.UseSqlServer(configuration.GetConnectionString("DefaultConnection"));

            options.ConfigureWarnings(w =>
                w.Ignore(RelationalEventId.PendingModelChangesWarning));

            options.AddInterceptors(
              sp.GetRequiredService<SoftDeleteInterceptor>(),
              sp.GetRequiredService<TenantInterceptor>());
        });

        // apply interceptor for soft delete
        services.AddSingleton<SoftDeleteInterceptor>();

        // apply interceptor for tenant (center) stamping
        services.AddScoped<TenantInterceptor>();

        services.AddScoped(typeof(IGenericRepository<>), typeof(GenericRepository<>));

        services.AddScoped<IRepositoryManager, RepositoryManager>();

        return services;
    }
}

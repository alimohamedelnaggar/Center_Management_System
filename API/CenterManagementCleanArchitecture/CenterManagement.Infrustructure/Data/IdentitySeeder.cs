using CenterManagement.Data.AppMetaData;
using CenterManagement.Data.Entities;
using CenterManagement.Data.Entities.Identity;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace CenterManagement.Infrustructure.Data;

/// <summary>
/// Seeds roles and the two platform accounts (SuperAdmin, demo CenterOwner).
/// Passwords are read from configuration (<c>Seed:SuperAdminPassword</c>,
/// <c>Seed:CenterOwnerPassword</c>); when a password is not configured the
/// matching account is <b>not</b> created, so no default credential ever ships
/// in source. Set them locally with user-secrets.
/// </summary>
public static class IdentitySeeder
{
    public static async Task SeedAsync(IServiceProvider serviceProvider)
    {
        var roleManager = serviceProvider.GetRequiredService<RoleManager<Role>>();
        var userManager = serviceProvider.GetRequiredService<UserManager<User>>();
        var dbContext = serviceProvider.GetRequiredService<AppDbContext>();
        var configuration = serviceProvider.GetRequiredService<IConfiguration>();

        foreach (var roleName in new[] { AppRoles.Assistant, AppRoles.Parent, AppRoles.Student, AppRoles.SuperAdmin, AppRoles.CenterOwner, AppRoles.Teacher })
        {
            if (await roleManager.RoleExistsAsync(roleName))
                continue;

            await roleManager.CreateAsync(new Role { Name = roleName });
        }

        var studentUserIds = await dbContext.Students
            .Where(s => s.UserId != null)
            .Select(s => s.UserId!.Value)
            .Distinct()
            .ToListAsync();

        foreach (var userId in studentUserIds)
        {
            var user = await userManager.FindByIdAsync(userId.ToString());

            if (user is null)
                continue;

            if (!await userManager.IsInRoleAsync(user, AppRoles.Student))
                await userManager.AddToRoleAsync(user, AppRoles.Student);
        }

        // Seed SuperAdmin (only when a password is configured).
        var superAdminPhone = configuration["Seed:SuperAdminPhone"] ?? "01000000005";
        await EnsureAccountAsync(
            userManager,
            phone: superAdminPhone,
            password: configuration["Seed:SuperAdminPassword"],
            fullName: "صاحب المشروع",
            role: AppRoles.SuperAdmin);

        // Seed CenterOwner (only when a password is configured).
        var centerOwnerPhone = configuration["Seed:CenterOwnerPhone"] ?? "01000000006";
        var coUser = await EnsureAccountAsync(
            userManager,
            phone: centerOwnerPhone,
            password: configuration["Seed:CenterOwnerPassword"],
            fullName: "صاحب المركز التجريبي",
            role: AppRoles.CenterOwner);

        if (coUser is null)
            return;

        // Ensure the demo CenterOwner owns a center and is linked to it so that
        // tenant isolation scopes all his requests to that center.
        if (coUser.CenterId == null)
        {
            var demoCenter = await dbContext.Centers.FirstOrDefaultAsync(c => c.OwnerId == coUser.Id);

            if (demoCenter == null)
            {
                demoCenter = new Center
                {
                    Id = Guid.NewGuid(),
                    Name = "المركز التجريبي",
                    OwnerId = coUser.Id,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow
                };

                dbContext.Centers.Add(demoCenter);
                await dbContext.SaveChangesAsync();
            }

            coUser.CenterId = demoCenter.Id;
            await userManager.UpdateAsync(coUser);
        }

        // Ensure the demo center has its module rows (idempotent; a missing row
        // means "disabled", so provisioning keeps the demo center fully enabled).
        var existingModules = await dbContext.CenterModules
            .Where(m => m.CenterId == coUser.CenterId)
            .Select(m => m.ModuleKey)
            .ToListAsync();

        var missingModules = CenterModuleFactory
            .CreateFullSet(coUser.CenterId!.Value)
            .Where(m => !existingModules.Contains(m.ModuleKey))
            .ToList();

        if (missingModules.Count > 0)
        {
            dbContext.CenterModules.AddRange(missingModules);
            await dbContext.SaveChangesAsync();
        }
    }

    /// <summary>
    /// Returns the existing account for the phone, or creates it with the
    /// configured password. Returns null when the password is not configured
    /// (no account is created) or creation fails.
    /// </summary>
    private static async Task<User?> EnsureAccountAsync(
        UserManager<User> userManager,
        string phone,
        string? password,
        string fullName,
        string role)
    {
        var existing = await userManager.Users
            .FirstOrDefaultAsync(x => x.PhoneNumber == phone);

        if (existing is not null)
        {
            if (!await userManager.IsInRoleAsync(existing, role))
                await userManager.AddToRoleAsync(existing, role);

            return existing;
        }

        if (string.IsNullOrWhiteSpace(password))
            return null;

        var user = new User
        {
            Id = Guid.NewGuid(),
            UserName = phone,
            PhoneNumber = phone,
            FullName = fullName,
            EmailConfirmed = true,
            CreatedAt = DateTime.UtcNow
        };

        var createResult = await userManager.CreateAsync(user, password);

        if (!createResult.Succeeded)
            return null;

        await userManager.AddToRoleAsync(user, role);

        return user;
    }
}

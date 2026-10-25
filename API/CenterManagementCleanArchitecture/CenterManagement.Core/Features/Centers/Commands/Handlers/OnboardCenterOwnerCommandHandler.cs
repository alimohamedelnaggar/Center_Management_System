using CenterManagement.Core.Bases;
using CenterManagement.Core.Features.Centers.Commands.Models;
using CenterManagement.Core.Features.Subscriptions.Commands.Handlers;
using CenterManagement.Data.AppMetaData;
using CenterManagement.Data.Entities;
using CenterManagement.Data.Entities.Abstractions;
using CenterManagement.Data.Entities.Identity;
using CenterManagement.Data.Entities.Subscriptions;
using CenterManagement.Data.Enums;
using CenterManagement.Infrustructure.Data;
using CenterManagement.Infrustructure.InfrastructureBases.Bases;
using MediatR;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Localization;

namespace CenterManagement.Core.Features.Centers.Commands.Handlers;

public class OnboardCenterOwnerCommandHandler
    : ResponseHandler, IRequestHandler<OnboardCenterOwnerCommand, Response<OnboardCenterOwnerResult>>
{
    private readonly IRepositoryManager _repositoryManager;
    private readonly AppDbContext _context;
    private readonly UserManager<User> _userManager;
    private readonly RoleManager<Role> _roleManager;
    private readonly IAuditLogService _auditLog;

    public OnboardCenterOwnerCommandHandler(
        IStringLocalizer<SharedResources> localizer,
        IRepositoryManager repositoryManager,
        AppDbContext context,
        UserManager<User> userManager,
        RoleManager<Role> roleManager,
        IAuditLogService auditLog) : base(localizer)
    {
        _repositoryManager = repositoryManager;
        _context = context;
        _userManager = userManager;
        _roleManager = roleManager;
        _auditLog = auditLog;
    }

    public async Task<Response<OnboardCenterOwnerResult>> Handle(
        OnboardCenterOwnerCommand request,
        CancellationToken cancellationToken)
    {
        var phone = request.OwnerPhone.Trim();

        var isSoloTeacher = string.Equals(request.AccountType, AppRoles.Teacher, StringComparison.OrdinalIgnoreCase);

        var accountType = isSoloTeacher ? AppRoles.Teacher : AppRoles.CenterOwner;

        var phoneExists = await _userManager.Users
            .AnyAsync(x => x.PhoneNumber == phone, cancellationToken);

        if (phoneExists)
            return BadRequest<OnboardCenterOwnerResult>("رقم الهاتف مستخدم بالفعل.");

        if (!await _roleManager.RoleExistsAsync(accountType))
            await _roleManager.CreateAsync(new Role { Name = accountType });

        // A temporary password is generated when the operator doesn't supply one.
        var password = string.IsNullOrWhiteSpace(request.OwnerPassword)
            ? GenerateTemporaryPassword()
            : request.OwnerPassword.Trim();

        await using var transaction = await _repositoryManager.BeginTransactionAsync();

        try
        {
            // 1) Persist the center first so the owner's CenterId foreign key is valid.
            var center = new Center
            {
                Name = request.CenterName.Trim(),
                Phone = string.IsNullOrWhiteSpace(request.CenterPhone) ? phone : request.CenterPhone.Trim(),
                Address = request.CenterAddress?.Trim(),
                Description = request.CenterDescription?.Trim(),
                ThemeColor = request.ThemeColor,
                IsActive = true,
                Status = CenterStatus.Active,
                Type = isSoloTeacher ? CenterType.SoloTeacher : CenterType.MultiTeacher
            };

            await _repositoryManager.CenterRepository.AddAsync(center);
            await _repositoryManager.SaveChangesAsync();

            // Provision the module rows. A missing CenterModules row means
            // "disabled", so every key needs a row. When the operator picked a
            // module set only those keys are enabled (prerequisites auto-enabled);
            // otherwise the full set is enabled by default.
            var enabledKeys = request.EnabledModules is { Count: > 0 }
                ? ModuleCatalog.ClosureToEnable(request.EnabledModules)
                : new HashSet<string>(ModuleKeys.All, StringComparer.OrdinalIgnoreCase);

            _context.CenterModules.AddRange(ModuleKeys.All.Select(key => new CenterModule
            {
                CenterId = center.Id,
                ModuleKey = key,
                IsEnabled = enabledKeys.Contains(key)
            }));
            await _repositoryManager.SaveChangesAsync();

            // 2) Create the owner account linked to that center.
            // A solo teacher owns and administers his own single-teacher center,
            // so he is flagged as a center admin (same powers as a CenterOwner).
            var owner = new User
            {
                Id = Guid.NewGuid(),
                UserName = phone,
                PhoneNumber = phone,
                FullName = request.OwnerFullName.Trim(),
                EmailConfirmed = true,
                CenterId = center.Id,
                IsCenterAdmin = isSoloTeacher,
                MustChangePassword = true,
                CreatedAt = DateTime.UtcNow
            };

            var createResult = await _userManager.CreateAsync(owner, password);

            if (!createResult.Succeeded)
            {
                await transaction.RollbackAsync();
                return BadRequest<OnboardCenterOwnerResult>(
                    string.Join(Environment.NewLine,
                        createResult.Errors.Select(e => e.Description)));
            }

            await _userManager.AddToRoleAsync(owner, accountType);

            // A solo teacher's subject is stored on his TeacherProfile so the
            // groups list can show it instead of a teacher column.
            if (isSoloTeacher && !string.IsNullOrWhiteSpace(request.Subject))
            {
                _context.TeacherProfiles.Add(new CenterManagement.Data.Entities.Teachers.TeacherProfile
                {
                    UserId = owner.Id,
                    Subject = request.Subject!.Trim(),
                    CenterId = center.Id
                });
                await _repositoryManager.SaveChangesAsync();
            }

            // 3) Mark the center ownership.
            center.OwnerId = owner.Id;
            await _repositoryManager.SaveChangesAsync();

            // 4) Optional initial subscription (SuperAdmin create form).
            if (request.SubscriptionType is { } planType)
            {
                var now = DateTime.UtcNow;
                var start = (request.SubscriptionStart ?? now).Date;
                var end = planType == SubscriptionPlanType.Lifetime
                    ? null
                    : request.SubscriptionEnd?.Date ?? CenterSubscriptionCommandHandler.ComputeEnd(start, planType);

                center.SubscriptionStart = start;
                center.SubscriptionEnd = end;
                center.GraceDays = request.GraceDays ?? center.GraceDays;
                center.Plan = string.IsNullOrWhiteSpace(request.Plan)
                    ? CenterSubscriptionCommandHandler.PlanLabel(planType)
                    : request.Plan!.Trim();

                CenterSubscriptionCommandHandler.ApplyEffectiveStatus(center, now);

                _context.CenterSubscriptions.Add(new CenterSubscription
                {
                    CenterId = center.Id,
                    Type = planType,
                    StartDate = start,
                    EndDate = end,
                    Price = request.Price ?? 0m,
                    PaidAmount = request.PaidAmount ?? 0m,
                    Currency = string.IsNullOrWhiteSpace(request.Currency) ? "EGP" : request.Currency!.Trim(),
                    Notes = request.SubscriptionNotes?.Trim()
                });

                await _repositoryManager.SaveChangesAsync();
            }

            await transaction.CommitAsync();

            await _auditLog.WriteAsync(
                action: "OnboardCenter",
                entityType: "Center",
                entityId: center.Id.ToString(),
                details: $"Created {(isSoloTeacher ? "solo teacher" : "center owner")} center '{center.Name}' for {phone}",
                cancellationToken: cancellationToken);

            return Success(new OnboardCenterOwnerResult
            {
                CenterId = center.Id,
                OwnerId = owner.Id,
                OwnerPhone = phone,
                AccountType = accountType,
                InitialPassword = password,
                MustChangePassword = true
            }, isSoloTeacher
                ? "تم إنشاء حساب المدرس والمركز بنجاح"
                : "تم إنشاء حساب صاحب المركز والمركز بنجاح");
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            return BadRequest<OnboardCenterOwnerResult>(
                ex.InnerException?.Message ?? ex.Message);
        }
    }

    private static string GenerateTemporaryPassword()
    {
        const string alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
        var buffer = new byte[10];
        RandomNumberGenerator.Fill(buffer);

        var chars = new char[buffer.Length];
        for (var i = 0; i < buffer.Length; i++)
            chars[i] = alphabet[buffer[i] % alphabet.Length];

        return new string(chars);
    }
}

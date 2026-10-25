using CenterManagement.Core.Features.UsersFeature.Teacher.Commands.Models;
using CenterManagement.Data.AppMetaData;
using CenterManagement.Data.Entities.Abstractions;
using CenterManagement.Data.Entities.Groups;
using CenterManagement.Data.Entities.Identity;
using CenterManagement.Infrustructure.Data;
using CenterManagement.Infrustructure.InfrastructureBases.Bases;

namespace CenterManagement.Core.Features.UsersFeature.Teacher.Commands.Handlers;

public class AddTeacherCommandHandler
    : ResponseHandler, IRequestHandler<AddTeacherCommand, Response<string>>
{
    private readonly UserManager<User> _userManager;
    private readonly RoleManager<Role> _roleManager;
    private readonly IRepositoryManager _repositoryManager;
    private readonly ITenantContext _tenantContext;
    private readonly AppDbContext _context;

    public AddTeacherCommandHandler(
        IStringLocalizer<SharedResources> localizer,
        UserManager<User> userManager,
        RoleManager<Role> roleManager,
        IRepositoryManager repositoryManager,
        ITenantContext tenantContext,
        AppDbContext context) : base(localizer)
    {
        _userManager = userManager;
        _roleManager = roleManager;
        _repositoryManager = repositoryManager;
        _tenantContext = tenantContext;
        _context = context;
    }

    public async Task<Response<string>> Handle(AddTeacherCommand request, CancellationToken cancellationToken)
    {
        // Center owners create teachers inside their own center; privileged
        // callers may target a specific center.
        var centerId = _tenantContext.IsUnrestricted
            ? (request.CenterId ?? _tenantContext.CenterId)
            : _tenantContext.CenterId;

        if (centerId is null)
            return BadRequest<string>("لا يوجد مركز مرتبط بهذا الحساب");

        // A solo-teacher center cannot host more than its single teacher.
        var centerType = await _context.Centers
            .IgnoreQueryFilters()
            .Where(c => c.Id == centerId.Value)
            .Select(c => (CenterManagement.Data.Enums.CenterType?)c.Type)
            .FirstOrDefaultAsync(cancellationToken);

        if (centerType == CenterManagement.Data.Enums.CenterType.SoloTeacher)
            return BadRequest<string>("رقّي السنتر إلى متعدد المدرسين أولًا لإضافة مدرسين");

        if (request.Password != request.ConfirmPassword)
            return BadRequest<string>("كلمة المرور غير متطابقة");

        var phone = request.PhoneNumber.Trim();

        if (await _userManager.Users.AnyAsync(x => x.PhoneNumber == phone, cancellationToken))
            return BadRequest<string>("رقم الهاتف مستخدم بالفعل.");

        if (!await _roleManager.RoleExistsAsync(AppRoles.Teacher))
            await _roleManager.CreateAsync(new Role { Name = AppRoles.Teacher });

        await using var transaction = await _repositoryManager.BeginTransactionAsync();

        try
        {
            var teacher = new User
            {
                Id = Guid.NewGuid(),
                FullName = request.FullName.Trim(),
                UserName = phone,
                PhoneNumber = phone,
                EmailConfirmed = true,
                CenterId = centerId,
                CreatedAt = DateTime.UtcNow
            };

            var createResult = await _userManager.CreateAsync(teacher, request.Password);

            if (!createResult.Succeeded)
            {
                await transaction.RollbackAsync();
                return BadRequest<string>(
                    string.Join(Environment.NewLine, createResult.Errors.Select(e => e.Description)));
            }

            await _userManager.AddToRoleAsync(teacher, AppRoles.Teacher);

            if (!string.IsNullOrWhiteSpace(request.Subject))
            {
                _context.TeacherProfiles.Add(new CenterManagement.Data.Entities.Teachers.TeacherProfile
                {
                    UserId = teacher.Id,
                    Subject = request.Subject.Trim(),
                    CenterId = centerId
                });

                await _context.SaveChangesAsync(cancellationToken);
            }

            if (request.GroupIds is { Count: > 0 })
            {
                var groupIds = request.GroupIds.Distinct().ToList();

                var validGroupIds = await _context.Groups
                    .Where(g => groupIds.Contains(g.Id) && (centerId == null || g.CenterId == centerId))
                    .Select(g => g.Id)
                    .ToListAsync(cancellationToken);

                foreach (var groupId in validGroupIds)
                {
                    _context.TeacherGroups.Add(new TeacherGroup
                    {
                        TeacherId = teacher.Id,
                        GroupId = groupId,
                        CenterId = centerId
                    });
                }

                await _context.SaveChangesAsync(cancellationToken);
            }

            await transaction.CommitAsync();

            return Success("تم إنشاء المدرس بنجاح");
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            return BadRequest<string>(ex.InnerException?.Message ?? ex.Message);
        }
    }
}

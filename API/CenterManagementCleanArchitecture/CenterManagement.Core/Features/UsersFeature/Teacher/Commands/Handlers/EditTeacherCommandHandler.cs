using CenterManagement.Core.Features.UsersFeature.Teacher.Commands.Models;
using CenterManagement.Data.AppMetaData;
using CenterManagement.Data.Entities.Abstractions;
using CenterManagement.Data.Entities.Groups;
using CenterManagement.Data.Entities.Identity;
using CenterManagement.Infrustructure.Data;
using CenterManagement.Infrustructure.InfrastructureBases.Bases;

namespace CenterManagement.Core.Features.UsersFeature.Teacher.Commands.Handlers;

public class EditTeacherCommandHandler
    : ResponseHandler, IRequestHandler<EditTeacherCommand, Response<string>>
{
    private readonly UserManager<User> _userManager;
    private readonly ITenantContext _tenantContext;
    private readonly AppDbContext _context;

    public EditTeacherCommandHandler(
        IStringLocalizer<SharedResources> localizer,
        UserManager<User> userManager,
        ITenantContext tenantContext,
        AppDbContext context) : base(localizer)
    {
        _userManager = userManager;
        _tenantContext = tenantContext;
        _context = context;
    }

    public async Task<Response<string>> Handle(EditTeacherCommand request, CancellationToken cancellationToken)
    {
        var user = await _userManager.FindByIdAsync(request.Id.ToString());

        if (user is null)
            return NotFound<string>("المدرس غير موجود");

        if (!await _userManager.IsInRoleAsync(user, AppRoles.Teacher))
            return BadRequest<string>("هذا الحساب ليس مدرسًا");

        if (!_tenantContext.IsUnrestricted && user.CenterId != _tenantContext.CenterId)
            return NotFound<string>("المدرس غير موجود");

        var phone = request.PhoneNumber?.Trim();

        if (!string.IsNullOrWhiteSpace(phone) && phone != user.PhoneNumber)
        {
            if (await _userManager.Users.AnyAsync(x => x.PhoneNumber == phone && x.Id != user.Id, cancellationToken))
                return BadRequest<string>("رقم الهاتف مستخدم بالفعل.");

            user.PhoneNumber = phone;
            user.UserName = phone;
        }

        user.FullName = request.FullName.Trim();
        user.UpdatedAt = DateTime.UtcNow;

        var result = await _userManager.UpdateAsync(user);

        if (!result.Succeeded)
            return BadRequest<string>(
                string.Join(Environment.NewLine, result.Errors.Select(e => e.Description)));

        var subject = request.Subject?.Trim();

        if (!string.IsNullOrWhiteSpace(subject))
        {
            var profile = await _context.TeacherProfiles
                .FirstOrDefaultAsync(p => p.UserId == user.Id, cancellationToken);

            if (profile is null)
            {
                _context.TeacherProfiles.Add(new CenterManagement.Data.Entities.Teachers.TeacherProfile
                {
                    UserId = user.Id,
                    Subject = subject,
                    CenterId = user.CenterId
                });
            }
            else
            {
                profile.Subject = subject;
                profile.UpdatedAt = DateTime.UtcNow;
            }

            await _context.SaveChangesAsync(cancellationToken);
        }

        if (request.GroupIds is not null)
        {
            var existing = await _context.TeacherGroups
                .Where(tg => tg.TeacherId == user.Id)
                .ToListAsync(cancellationToken);

            _context.TeacherGroups.RemoveRange(existing);

            var groupIds = request.GroupIds.Distinct().ToList();

            if (groupIds.Count > 0)
            {
                var validGroupIds = await _context.Groups
                    .Where(g => groupIds.Contains(g.Id) && (user.CenterId == null || g.CenterId == user.CenterId))
                    .Select(g => g.Id)
                    .ToListAsync(cancellationToken);

                foreach (var groupId in validGroupIds)
                {
                    _context.TeacherGroups.Add(new TeacherGroup
                    {
                        TeacherId = user.Id,
                        GroupId = groupId,
                        CenterId = user.CenterId
                    });
                }
            }

            await _context.SaveChangesAsync(cancellationToken);
        }

        return Success<string>(null, "تم تحديث بيانات المدرس بنجاح");
    }
}

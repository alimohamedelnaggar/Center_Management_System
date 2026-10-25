using CenterManagement.Core.Bases;
using CenterManagement.Core.Features.Auth.Profile.Command.Models;
using CenterManagement.Core.Features.Impersonation.Commands.Models;
using CenterManagement.Data.AppMetaData;
using CenterManagement.Data.Entities.Identity;
using CenterManagement.Data.Entities.Teachers;
using CenterManagement.Infrustructure.Data;
using MediatR;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Localization;
using System.Security.Claims;

namespace CenterManagement.Core.Features.Auth.Profile.Command.Handlers;

public class UpdateMySubjectCommandHandler
    : ResponseHandler,
      IRequestHandler<UpdateMySubjectCommand, Response<string>>
{
    private readonly UserManager<User> _userManager;
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly AppDbContext _context;

    public UpdateMySubjectCommandHandler(
        UserManager<User> userManager,
        IHttpContextAccessor httpContextAccessor,
        AppDbContext context,
        IStringLocalizer<SharedResources> localizer)
        : base(localizer)
    {
        _userManager = userManager;
        _httpContextAccessor = httpContextAccessor;
        _context = context;
    }

    public async Task<Response<string>> Handle(
        UpdateMySubjectCommand request,
        CancellationToken cancellationToken)
    {
        var userId = _httpContextAccessor.HttpContext?
            .User
            .FindFirstValue(ClaimTypes.NameIdentifier);

        if (string.IsNullOrEmpty(userId))
            return Unauthorized<string>();

        // Never allow profile changes while an operator is impersonating the
        // account — the change would silently land on the impersonated user.
        var impersonating = string.Equals(
            _httpContextAccessor.HttpContext?.User
                .FindFirst(ImpersonationClaims.IsImpersonation)?.Value,
            ImpersonationClaims.TrueValue,
            StringComparison.OrdinalIgnoreCase);

        if (impersonating)
            return Forbidden<string>("لا يمكن تعديل الملف الشخصي أثناء انتحال الهوية");

        var user = await _userManager.FindByIdAsync(userId);

        if (user == null)
            return NotFound<string>();

        // Only teachers carry a TeacherProfile; other roles have no subject.
        var roles = await _userManager.GetRolesAsync(user);

        if (!roles.Contains(AppRoles.Teacher))
            return BadRequest<string>("هذا الحساب ليس حساب مدرس");

        var subject = request.Subject.Trim();

        var profile = await _context.TeacherProfiles
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(tp => tp.UserId == user.Id, cancellationToken);

        if (profile is null)
        {
            _context.TeacherProfiles.Add(new TeacherProfile
            {
                UserId = user.Id,
                Subject = subject,
                CenterId = user.CenterId
            });
        }
        else
        {
            profile.Subject = subject;
        }

        await _context.SaveChangesAsync(cancellationToken);

        return Success("تم تحديث المادة الدراسية بنجاح");
    }
}

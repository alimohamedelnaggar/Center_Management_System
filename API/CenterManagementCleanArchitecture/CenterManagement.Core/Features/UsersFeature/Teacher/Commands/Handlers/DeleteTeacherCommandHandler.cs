using CenterManagement.Core.Features.UsersFeature.Teacher.Commands.Models;
using CenterManagement.Data.AppMetaData;
using CenterManagement.Data.Entities.Abstractions;
using CenterManagement.Data.Entities.Identity;
using CenterManagement.Infrustructure.InfrastructureBases.Bases;

namespace CenterManagement.Core.Features.UsersFeature.Teacher.Commands.Handlers;

public class DeleteTeacherCommandHandler
    : ResponseHandler, IRequestHandler<DeleteTeacherCommand, Response<string>>
{
    private readonly UserManager<User> _userManager;
    private readonly ITenantContext _tenantContext;

    public DeleteTeacherCommandHandler(
        IStringLocalizer<SharedResources> localizer,
        UserManager<User> userManager,
        ITenantContext tenantContext) : base(localizer)
    {
        _userManager = userManager;
        _tenantContext = tenantContext;
    }

    public async Task<Response<string>> Handle(DeleteTeacherCommand request, CancellationToken cancellationToken)
    {
        var user = await _userManager.FindByIdAsync(request.Id.ToString());

        if (user is null)
            return NotFound<string>("المدرس غير موجود");

        if (!await _userManager.IsInRoleAsync(user, AppRoles.Teacher))
            return BadRequest<string>("هذا الحساب ليس مدرسًا");

        if (!_tenantContext.IsUnrestricted && user.CenterId != _tenantContext.CenterId)
            return NotFound<string>("المدرس غير موجود");

        var result = await _userManager.DeleteAsync(user);

        if (!result.Succeeded)
            return BadRequest<string>(
                string.Join(Environment.NewLine, result.Errors.Select(e => e.Description)));

        return Success<string>(null, "تم حذف المدرس بنجاح");
    }
}

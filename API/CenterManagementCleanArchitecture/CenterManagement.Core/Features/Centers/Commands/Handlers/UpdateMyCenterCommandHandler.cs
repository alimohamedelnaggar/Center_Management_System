using CenterManagement.Core.Bases;
using CenterManagement.Core.Features.Centers.Commands.Models;
using CenterManagement.Data.Entities.Abstractions;
using CenterManagement.Infrustructure.InfrastructureBases.Bases;
using MediatR;
using Microsoft.Extensions.Localization;

namespace CenterManagement.Core.Features.Centers.Commands.Handlers;

public class UpdateMyCenterCommandHandler
    : ResponseHandler, IRequestHandler<UpdateMyCenterCommand, Response<string>>
{
    private readonly IRepositoryManager _repositoryManager;
    private readonly ITenantContext _tenantContext;

    public UpdateMyCenterCommandHandler(
        IStringLocalizer<SharedResources> localizer,
        IRepositoryManager repositoryManager,
        ITenantContext tenantContext) : base(localizer)
    {
        _repositoryManager = repositoryManager;
        _tenantContext = tenantContext;
    }

    public async Task<Response<string>> Handle(UpdateMyCenterCommand request, CancellationToken cancellationToken)
    {
        // Center owners are bound to their tenant center. Privileged users
        // (Admin/SuperAdmin) may pass an explicit target center.
        var centerId = _tenantContext.IsUnrestricted
            ? (request.CenterId ?? _tenantContext.CenterId)
            : _tenantContext.CenterId;

        if (centerId is null)
            return BadRequest<string>("لا يوجد مركز مرتبط بهذا الحساب");

        var center = await _repositoryManager.CenterRepository.GetByIdAsync(centerId.Value);

        if (center is null)
            return NotFound<string>("المركز غير موجود");

        center.Name = request.Name.Trim();
        center.Phone = request.Phone?.Trim();
        center.Address = request.Address?.Trim();
        center.Description = request.Description?.Trim();
        center.LogoUrl = request.LogoUrl;
        center.ThemeColor = request.ThemeColor;
        center.UpdatedAt = DateTime.UtcNow;

        await _repositoryManager.CenterRepository.UpdateAsync(center);
        await _repositoryManager.SaveChangesAsync();

        return Success<string>(null, "تم تحديث بيانات المركز بنجاح");
    }
}

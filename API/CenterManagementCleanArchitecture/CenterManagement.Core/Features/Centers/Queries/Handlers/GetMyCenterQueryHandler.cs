using CenterManagement.Core.Bases;
using CenterManagement.Core.Features.Centers.Queries.Models;
using CenterManagement.Data.Entities.Abstractions;
using CenterManagement.Infrustructure.InfrastructureBases.Bases;
using MediatR;
using Microsoft.Extensions.Localization;

namespace CenterManagement.Core.Features.Centers.Queries.Handlers;

public class GetMyCenterQueryHandler : ResponseHandler, IRequestHandler<GetMyCenterQuery, Response<CenterDto>>
{
    private readonly IRepositoryManager _repositoryManager;
    private readonly ITenantContext _tenantContext;

    public GetMyCenterQueryHandler(
        IStringLocalizer<SharedResources> localizer,
        IRepositoryManager repositoryManager,
        ITenantContext tenantContext) : base(localizer)
    {
        _repositoryManager = repositoryManager;
        _tenantContext = tenantContext;
    }

    public async Task<Response<CenterDto>> Handle(GetMyCenterQuery request, CancellationToken cancellationToken)
    {
        var centerId = _tenantContext.CenterId;

        if (centerId is null)
            return Success<CenterDto>(null, "لا يوجد مركز مرتبط بهذا الحساب");

        var center = await _repositoryManager.CenterRepository.GetByIdAsync(centerId.Value);

        if (center is null)
            return NotFound<CenterDto>("المركز غير موجود");

        return Success(new CenterDto
        {
            Id = center.Id,
            Name = center.Name,
            LogoUrl = center.LogoUrl,
            Phone = center.Phone,
            Address = center.Address,
            ThemeColor = center.ThemeColor,
            Description = center.Description,
            IsActive = center.IsActive,
            OwnerId = center.OwnerId,
            CreatedAt = center.CreatedAt
        });
    }
}

using CenterManagement.Core.Bases;
using CenterManagement.Core.Features.Centers.Commands.Models;
using CenterManagement.Data.AppMetaData;
using CenterManagement.Data.Entities;
using CenterManagement.Data.Entities.Identity;
using CenterManagement.Infrustructure.Data;
using CenterManagement.Infrustructure.InfrastructureBases.Bases;
using MediatR;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Localization;

namespace CenterManagement.Core.Features.Centers.Commands.Handlers;

public class AddCenterCommandHandler : ResponseHandler, IRequestHandler<AddCenterCommand, Response<string>>
{
    private readonly IRepositoryManager _repositoryManager;
    private readonly AppDbContext _context;
    private readonly UserManager<User> _userManager;

    public AddCenterCommandHandler(IStringLocalizer<SharedResources> localizer, IRepositoryManager repositoryManager, AppDbContext context, UserManager<User> userManager) : base(localizer)
    {
        _repositoryManager = repositoryManager;
        _context = context;
        _userManager = userManager;
    }

    public async Task<Response<string>> Handle(AddCenterCommand request, CancellationToken cancellationToken)
    {
        var center = new Center
        {
            Name = request.Name.Trim(),
            Phone = request.Phone,
            Address = request.Address,
            Description = request.Description,
            OwnerId = request.OwnerId,
            IsActive = true
        };

        await _repositoryManager.CenterRepository.AddAsync(center);
        await _repositoryManager.SaveChangesAsync();

        // Provision the full module set (missing row = disabled).
        _context.CenterModules.AddRange(CenterModuleFactory.CreateFullSet(center.Id));
        await _repositoryManager.SaveChangesAsync();

        // Link the owner account to the new center so that tenant isolation applies
        // to every request he makes (his CenterId claim is built from User.CenterId).
        if (request.OwnerId.HasValue)
        {
            var owner = await _userManager.FindByIdAsync(request.OwnerId.Value.ToString());

            if (owner is not null)
            {
                owner.CenterId = center.Id;
                await _userManager.UpdateAsync(owner);

                if (!await _userManager.IsInRoleAsync(owner, AppRoles.CenterOwner))
                    await _userManager.AddToRoleAsync(owner, AppRoles.CenterOwner);
            }
        }

        return Success("Center added successfully");
    }
}

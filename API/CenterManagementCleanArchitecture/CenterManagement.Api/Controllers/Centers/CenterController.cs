using CenterManagement.Api.Base;
using CenterManagement.Core.Features.Centers.Commands.Models;
using CenterManagement.Core.Features.Centers.Queries.Models;
using CenterManagement.Core.Features.Shared.UploadImage.Commands.Models;
using CenterManagement.Data.AppMetaData;
using Microsoft.AspNetCore.Authorization;

namespace CenterManagement.Api.Controllers.Centers;

public class CenterController : AppControllerBase
{
    // SuperAdmin onboards a teacher: creates his account + center together.
    [HttpPost(Routing.CenterRouting.CreateWithOwner)]
    [Authorize(Policy = AppPolicies.PlatformAdmin)]
    [PlatformEndpoint]
    public async Task<IActionResult> CreateWithOwner(OnboardCenterOwnerCommand command)
    {
        var response = await _mediator.Send(command);
        return NewResult(response);
    }

    [HttpPost(Routing.CenterRouting.Create)]
    [Authorize(Policy = AppPolicies.PlatformAdmin)]
    [PlatformEndpoint]
    public async Task<IActionResult> Create(AddCenterCommand command)
    {
        var response = await _mediator.Send(command);
        return NewResult(response);
    }

    [HttpGet(Routing.CenterRouting.GetMyCenters)]
    [Authorize(Policy = AppPolicies.PlatformAdmin)]
    [PlatformEndpoint]
    public async Task<IActionResult> GetMyCenters()
    {
        var response = await _mediator.Send(new GetMyCentersQuery());
        return NewResult(response);
    }

    [HttpGet(Routing.CenterRouting.Paginated)]
    [Authorize(Policy = AppPolicies.PlatformAdmin)]
    [PlatformEndpoint]
    public async Task<IActionResult> Paginated([FromQuery] GetCentersPaginatedQuery query)
    {
        var response = await _mediator.Send(query);
        return NewResult(response);
    }

    [HttpGet(Routing.CenterRouting.GetById)]
    [Authorize(Policy = AppPolicies.PlatformAdmin)]
    [PlatformEndpoint]
    public async Task<IActionResult> GetById(Guid id)
    {
        var response = await _mediator.Send(new GetCenterByIdQuery { Id = id });
        return NewResult(response);
    }

    // The center of the current user, used to white-label the site.
    [HttpGet(Routing.CenterRouting.MyCenter)]
    [CoreEndpoint]
    public async Task<IActionResult> MyCenter()
    {
        var response = await _mediator.Send(new GetMyCenterQuery());
        return NewResult(response);
    }

    [HttpPut(Routing.CenterRouting.UpdateMyCenter)]
    [Authorize(Policy = AppPolicies.CenterAdmin)]
    [CoreEndpoint]
    public async Task<IActionResult> UpdateMyCenter(UpdateMyCenterCommand command)
    {
        var response = await _mediator.Send(command);
        return NewResult(response);
    }

    [HttpPost(Routing.CenterRouting.UploadLogo)]
    [Authorize(Policy = AppPolicies.CenterAdmin)]
    [CoreEndpoint]
    public async Task<IActionResult> UploadLogo(IFormFile logo)
    {
        var response = await _mediator.Send(new UploadImageCommand
        {
            ImageFile = logo,
            FolderName = "centers"
        });

        return NewResult(response);
    }

    // SuperAdmin edits a center's details and (re)configures its subscription.
    [HttpPut(Routing.CenterRouting.Edit)]
    [Authorize(Policy = AppPolicies.PlatformAdmin)]
    [PlatformEndpoint]
    public async Task<IActionResult> Edit([FromBody] UpdateCenterCommand command)
    {
        var response = await _mediator.Send(command);
        return NewResult(response);
    }

    // SuperAdmin suspends or reactivates a center.
    [HttpPut(Routing.CenterRouting.SetStatus)]
    [Authorize(Policy = AppPolicies.PlatformAdmin)]
    [PlatformEndpoint]
    public async Task<IActionResult> SetStatus([FromRoute] Guid id, [FromBody] SetCenterStatusCommand command)
    {
        command.Id = id;
        var response = await _mediator.Send(command);
        return NewResult(response);
    }

    // SuperAdmin soft deletes a center.
    [HttpDelete(Routing.CenterRouting.Delete)]
    [Authorize(Policy = AppPolicies.PlatformAdmin)]
    [PlatformEndpoint]
    public async Task<IActionResult> Delete([FromRoute] Guid id)
    {
        var response = await _mediator.Send(new DeleteCenterCommand(id));
        return NewResult(response);
    }

    // Only the platform (SuperAdmin) may upgrade a center to multi-teacher.
    // A solo teacher asks the platform through the WhatsApp contact instead.
    [HttpPost(Routing.CenterRouting.UpgradeToMultiTeacher)]
    [Authorize(Policy = AppPolicies.PlatformAdmin)]
    [CoreEndpoint]
    public async Task<IActionResult> UpgradeToMultiTeacher([FromBody] UpgradeCenterToMultiTeacherCommand command)
    {
        var response = await _mediator.Send(command ?? new UpgradeCenterToMultiTeacherCommand());
        return NewResult(response);
    }
}

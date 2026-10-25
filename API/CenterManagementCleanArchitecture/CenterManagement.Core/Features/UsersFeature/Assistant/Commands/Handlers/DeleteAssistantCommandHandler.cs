using CenterManagement.Core.Bases;
using CenterManagement.Core.Features.UsersFeature.Assistant.Commands.Models;
using CenterManagement.Data.Entities.Identity;
using CenterManagement.Data.Entities.Users;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Localization;

namespace CenterManagement.Core.Features.UsersFeature.Assistant.Commands.Handlers;

public sealed class DeleteAssistantCommandHandler
    : ResponseHandler,
      IRequestHandler<DeleteAssistantCommand, Response<string>>
{
    private readonly UserManager<User> _userManager;

    public DeleteAssistantCommandHandler(
        UserManager<User> userManager,
        IStringLocalizer<SharedResources> localizer)
        : base(localizer)
    {
        _userManager = userManager;
    }

    public async Task<Response<string>> Handle(
        DeleteAssistantCommand request,
        CancellationToken cancellationToken)
    {
        var assistant = await _userManager.Users
            .OfType<Assistent>()
            .FirstOrDefaultAsync(x => x.Id == request.Id, cancellationToken);

        if (assistant is null)
            return NotFound<string>("المساعد غير موجود.");

        if (!assistant.IsActive)
            return BadRequest<string>("المساعد غير مفعل بالفعل.");

        assistant.IsActive = false;

        var result = await _userManager.UpdateAsync(assistant);

        if (!result.Succeeded)
        {
            return BadRequest<string>(
                string.Join(Environment.NewLine,
                    result.Errors.Select(x => x.Description)));
        }

        return Success("تم إيقاف المساعد بنجاح.");
    }
}
using CenterManagement.Core.Bases;
using CenterManagement.Data.Entities.Identity;
using CenterManagement.Data.Entities.Users;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Localization;

namespace CenterManagement.Core.Features.UsersFeature.Assistant.Commands.Handlers;

public sealed class EditAssistantCommandHandler
    : ResponseHandler,
      IRequestHandler<EditAssistantCommand, Response<string>>
{
    private readonly UserManager<User> _userManager;

    public EditAssistantCommandHandler(
        UserManager<User> userManager,
        IStringLocalizer<SharedResources> localizer)
        : base(localizer)
    {
        _userManager = userManager;
    }

    public async Task<Response<string>> Handle(
        EditAssistantCommand request,
        CancellationToken cancellationToken)
    {
        var assistant = await _userManager.Users
            .OfType<Assistent>()
            .FirstOrDefaultAsync(x => x.Id == request.Id, cancellationToken);

        if (assistant is null)
            return NotFound<string>("المساعد غير موجود.");

        var phoneExists = await _userManager.Users
            .AnyAsync(x =>
                x.PhoneNumber == request.PhoneNumber &&
                x.Id != request.Id,
                cancellationToken);

        if (phoneExists)
            return BadRequest<string>("رقم الهاتف مستخدم بالفعل.");

        if (!string.IsNullOrWhiteSpace(request.NationalId))
        {
            var nationalExists = await _userManager.Users
                .OfType<Assistent>()
                .AnyAsync(x =>
                    x.NationalId == request.NationalId &&
                    x.Id != request.Id,
                    cancellationToken);

            if (nationalExists)
                return BadRequest<string>("الرقم القومي مستخدم بالفعل.");
        }

        assistant.FullName = request.FullName.Trim();
        assistant.PhoneNumber = request.PhoneNumber.Trim();
        assistant.UserName = request.PhoneNumber.Trim();

        assistant.Salary = request.Salary;
        assistant.WorkingHoursPerWeek = request.WorkingHoursPerWeek;
        assistant.HireDate = request.HireDate;
        assistant.NationalId = request.NationalId?.Trim();
        assistant.Address = request.Address?.Trim();
        assistant.Notes = request.Notes?.Trim();
        assistant.TeacherId = request.TeacherId;
        assistant.IsActive = request.IsActive;

        var result = await _userManager.UpdateAsync(assistant);

        if (!result.Succeeded)
        {
            return BadRequest<string>(
                string.Join(Environment.NewLine,
                    result.Errors.Select(x => x.Description)));
        }

        return Success("تم تعديل بيانات المساعد بنجاح.");
    }
}